/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../mysql.js";
import { 
  coursesDb, usersDb, enrollmentsDb, progressDb, 
  assessmentsDb, assessmentAssignmentsDb, questionsDb, submissionsDb,
  learningPathsDb, learningPathItemsDb, learningPathAssignmentsDb, learningPathProgressDb,
  groupsDb, groupMembersDb 
} from "../db.js";
import { 
  User, UserRole, Course, Enrollment, Assessment, AssessmentAssignment, 
  LearningPath, LearningPathAssignment, Group, GroupMember, AccessStatus, AssignmentSource,
  EffectiveCourseAccess, EffectiveLearningPathAccess
} from "../../src/types.js";
import { logAuditEvent } from "../audit.js";
import { NotificationService } from "./notification.service.js";

export interface AssignCourseOptions {
  courseId: string;
  studentId: string;
  assignedBy: string;
  assignedByEmail?: string;
  assignedByRole?: string;
  dueDate?: string | null;
  isMandatory?: boolean;
  source?: AssignmentSource;
  sourceId?: string | null;
  organizationId?: string;
}

export interface AssignAssessmentOptions {
  assessmentId: string;
  studentId: string;
  assignedBy: string;
  assignedByEmail?: string;
  assignedByRole?: string;
  dueDate?: string | null;
  isMandatory?: boolean;
  source?: AssignmentSource;
  sourceId?: string | null;
  organizationId?: string;
}

export interface AssignLearningPathOptions {
  learningPathId: string;
  studentId: string;
  assignedBy: string;
  assignedByEmail?: string;
  assignedByRole?: string;
  dueDate?: string | null;
  isMandatory?: boolean;
  source?: AssignmentSource;
  sourceId?: string | null;
  organizationId?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  status: number;
  error?: string;
  isUnpublished?: boolean;
  enrollment?: Enrollment;
  assignment?: AssessmentAssignment | LearningPathAssignment;
  course?: Course;
  assessment?: Assessment;
  learningPath?: LearningPath;
}

export class AccessControlService {

  // =========================================================================
  // ACCESS STATE RESOLUTION & DYNAMIC STATUS
  // =========================================================================

  /**
   * Dynamically evaluate the unified access status of an assignment/enrollment.
   */
  static evaluateAccessStatus(item: {
    status?: AccessStatus;
    dueDate?: string | null;
    completedAt?: string | null;
    progressPercentage?: number;
  }): AccessStatus {
    if (item.status === "revoked") {
      return "revoked";
    }
    if (item.completedAt || (item.progressPercentage !== undefined && item.progressPercentage >= 100)) {
      return "completed";
    }
    if (item.dueDate && new Date(item.dueDate) < new Date()) {
      return "expired";
    }
    if ((item.progressPercentage || 0) > 0) {
      return "in_progress";
    }
    if (item.status === "not_started") {
      return "not_started";
    }
    return "assigned";
  }

  /**
   * Check if an assignment is overdue (dueDate passed and not completed).
   */
  static isOverdue(item: { dueDate?: string | null; completedAt?: string | null }): boolean {
    if (!item.dueDate) return false;
    return new Date(item.dueDate) < new Date() && !item.completedAt;
  }

  // =========================================================================
  // 1. COURSE ENROLLMENT (Individual, Bulk, Group, Revocation, Update)
  // =========================================================================

  /**
   * Assign a course to an individual student.
   * Restores previously revoked enrollment if present, preserving historical completion.
   */
  static async assignCourseToStudent(options: AssignCourseOptions): Promise<Enrollment> {
    const { 
      courseId, studentId, assignedBy, assignedByEmail, assignedByRole,
      dueDate, isMandatory = false, source = "individual", sourceId = null, organizationId = "org-default"
    } = options;

    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      throw new Error("Course not found");
    }

    const student = await usersDb.findOne({ id: studentId });
    if (!student) {
      throw new Error("Student not found");
    }
    if (student.status === "suspended") {
      throw new Error("Cannot assign course to a suspended student");
    }

    // Tenant boundary check
    const studentOrg = student.organizationId || "org-default";
    const courseOrg = course.organizationId || "org-default";
    if (studentOrg !== courseOrg && assignedByRole !== UserRole.SUPER_ADMIN) {
      throw new Error("Cannot assign course across different organizations");
    }

    const now = new Date().toISOString();
    const existing = await enrollmentsDb.findOne({ studentId, courseId }, { includeDeleted: true });

    let enrollment: Enrollment;

    if (existing) {
      // Re-activate or update existing enrollment record
      enrollment = await enrollmentsDb.update(existing.id, {
        status: existing.completedAt ? "completed" : (existing.progressPercentage || 0) > 0 ? "in_progress" : "assigned",
        assignedBy,
        assignedAt: now,
        dueDate: dueDate || null,
        isMandatory: Boolean(isMandatory),
        assignmentSource: source,
        assignmentSourceId: sourceId || null,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
        deletedAt: null
      }) as Enrollment;
    } else {
      enrollment = await enrollmentsDb.insert({
        organizationId: courseOrg,
        studentId,
        courseId,
        enrolledAt: now,
        status: "assigned",
        assignedBy,
        assignedAt: now,
        dueDate: dueDate || null,
        isMandatory: Boolean(isMandatory),
        assignmentSource: source,
        assignmentSourceId: sourceId || null,
        progressPercentage: 0
      });
    }

    await logAuditEvent({
      userId: assignedBy,
      userEmail: assignedByEmail,
      userRole: assignedByRole,
      organizationId: courseOrg,
      action: "assign_course",
      resourceType: "course_enrollment",
      resourceId: enrollment.id,
      details: {
        courseId,
        courseTitle: course.title,
        studentId,
        studentEmail: student.email,
        source,
        sourceId,
        dueDate,
        isMandatory
      }
    });

    // In-app & email notification trigger
    try {
      await NotificationService.notifyCourseAssigned(studentId, course, {
        dueDate: enrollment.dueDate,
        isMandatory: enrollment.isMandatory,
        assignedByName: assignedByEmail,
        orgId: courseOrg
      });
    } catch (err: any) {
      console.error("[Notification] Failed to notify course assigned:", err.message);
    }

    return enrollment;
  }

  /**
   * Bulk assign a course to multiple students.
   */
  static async assignCourseBulk(
    courseId: string, 
    studentIds: string[], 
    actor: { id: string; email: string; role: string; organizationId?: string },
    options: { dueDate?: string | null; isMandatory?: boolean; source?: AssignmentSource; sourceId?: string | null } = {}
  ): Promise<{ assignedCount: number; results: Array<{ studentId: string; success: boolean; error?: string }> }> {
    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];
    let assignedCount = 0;

    for (const studentId of studentIds) {
      try {
        await this.assignCourseToStudent({
          courseId,
          studentId,
          assignedBy: actor.id,
          assignedByEmail: actor.email,
          assignedByRole: actor.role,
          dueDate: options.dueDate,
          isMandatory: options.isMandatory,
          source: options.source || "bulk",
          sourceId: options.sourceId || null,
          organizationId: actor.organizationId
        });
        results.push({ studentId, success: true });
        assignedCount++;
      } catch (err: any) {
        results.push({ studentId, success: false, error: err.message });
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: actor.organizationId || "org-default",
      action: "bulk_assign_course",
      resourceType: "course",
      resourceId: courseId,
      details: {
        totalRequested: studentIds.length,
        assignedCount,
        dueDate: options.dueDate,
        isMandatory: options.isMandatory
      }
    });

    return { assignedCount, results };
  }

  /**
   * Assign a course to all members of a group.
   */
  static async assignCourseToGroup(
    courseId: string, 
    groupId: string, 
    actor: { id: string; email: string; role: string; organizationId?: string },
    options: { dueDate?: string | null; isMandatory?: boolean } = {}
  ): Promise<{ assignedCount: number; groupName: string }> {
    const group = await groupsDb.findOne({ id: groupId });
    if (!group) throw new Error("Group not found");

    const members = await groupMembersDb.find({ groupId });
    const studentIds = members.map(m => m.userId);

    const { assignedCount } = await this.assignCourseBulk(courseId, studentIds, actor, {
      ...options,
      source: "group",
      sourceId: groupId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: actor.organizationId || "org-default",
      action: "group_assign_course",
      resourceType: "course",
      resourceId: courseId,
      details: {
        groupId,
        groupName: group.name,
        assignedCount
      }
    });

    return { assignedCount, groupName: group.name };
  }

  /**
   * Non-destructive Course Access Revocation:
   * Prevents future access while strictly preserving past completions, progress, and submissions.
   */
  static async revokeCourseAccess(
    courseId: string, 
    studentId: string, 
    actor: { id: string; email?: string; role?: string },
    reason?: string
  ): Promise<boolean> {
    let enrollment = await enrollmentsDb.findOne({ studentId, courseId }, { includeDeleted: true });
    if (!enrollment) {
      // Check if student has batch access to this course
      const [batchRows]: any = await pool.query(`
        SELECT b.id, b.name
        FROM batch_students bs
        JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
        LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.courseId = ? AND bc.status = 'active'
        WHERE bs.studentId = ?
          AND bs.status = 'active'
          AND (b.courseId = ? OR bc.courseId = ?)
        LIMIT 1
      `, [courseId, studentId, courseId, courseId]);

      if (batchRows && batchRows.length > 0) {
        const now = new Date().toISOString();
        const student = await usersDb.findOne({ id: studentId });
        const course = await coursesDb.findOne({ id: courseId });
        enrollment = await enrollmentsDb.insert({
          organizationId: course?.organizationId || student?.organizationId || "org-default",
          studentId,
          courseId,
          enrolledAt: now,
          status: "revoked",
          assignedBy: actor.id,
          assignedAt: now,
          revokedAt: now,
          revokedBy: actor.id,
          revocationReason: reason || "Access revoked by administrator (explicit override of batch access)",
          assignmentSource: "individual",
          progressPercentage: 0
        });

        await logAuditEvent({
          userId: actor.id,
          userEmail: actor.email,
          userRole: actor.role,
          action: "revoke_course_access",
          resourceType: "course_enrollment",
          resourceId: enrollment.id,
          details: {
            courseId,
            studentId,
            reason: reason || "Access revoked by administrator (explicit override of batch access)",
            batchOverride: true
          }
        });

        return true;
      }

      throw new Error("Active enrollment not found for this student and course");
    }

    if (enrollment.status === "revoked" && !enrollment.deletedAt) {
      // Idempotent: already actively revoked with deletedAt null, nothing further to do
      return true;
    }

    const now = new Date().toISOString();
    await enrollmentsDb.update(enrollment.id, {
      status: "revoked",
      revokedAt: now,
      revokedBy: actor.id,
      revocationReason: reason || "Access revoked by administrator",
      deletedAt: null
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "revoke_course_access",
      resourceType: "course_enrollment",
      resourceId: enrollment.id,
      details: {
        courseId,
        studentId,
        reason: reason || "Access revoked by administrator",
        previousProgress: enrollment.progressPercentage
      }
    });

    return true;
  }

  /**
   * Remove direct course assignment from student (preserves batch access if present).
   */
  static async removeDirectCourseAssignment(
    courseId: string, 
    studentId: string, 
    actor: { id: string; email?: string; role?: string }
  ): Promise<boolean> {
    const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
    if (!enrollment) {
      throw new Error("Direct enrollment not found for this student and course");
    }

    const now = new Date().toISOString();
    await enrollmentsDb.update(enrollment.id, {
      status: "revoked",
      deletedAt: now,
      revokedAt: now,
      revokedBy: actor.id,
      revocationReason: "Direct assignment removed by administrator"
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "remove_direct_course_assignment",
      resourceType: "course_enrollment",
      resourceId: enrollment.id,
      details: { courseId, studentId }
    });

    return true;
  }

  /**
   * Restore course access for a student (clears explicit denial / unblocks batch or direct grant).
   */
  static async restoreCourseAccess(
    courseId: string, 
    studentId: string, 
    actor: { id: string; email?: string; role?: string }
  ): Promise<boolean> {
    const enrollment = await enrollmentsDb.findOne({ studentId, courseId }, { includeDeleted: true });
    if (!enrollment) {
      throw new Error("No enrollment record found for this student and course");
    }

    // Check if student has batch access
    const [batchRows]: any = await pool.query(`
      SELECT b.id FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
      LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.courseId = ? AND bc.status = 'active'
      WHERE bs.studentId = ? AND bs.status = 'active'
        AND (b.courseId = ? OR bc.courseId = ?)
      LIMIT 1
    `, [courseId, studentId, courseId, courseId]);

    const hasBatch = batchRows && batchRows.length > 0;
    const now = new Date().toISOString();

    if (hasBatch && enrollment.revocationReason?.includes("override of batch access")) {
      // Clear the override by soft-deleting the block record so batch access resumes
      await enrollmentsDb.update(enrollment.id, {
        deletedAt: now,
        revocationReason: "Batch block cleared by administrator"
      });
    } else {
      // Restore direct enrollment
      await enrollmentsDb.update(enrollment.id, {
        status: enrollment.completedAt ? "completed" : (enrollment.progressPercentage || 0) > 0 ? "in_progress" : "assigned",
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
        deletedAt: null
      });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "restore_course_access",
      resourceType: "course_enrollment",
      resourceId: enrollment.id,
      details: { courseId, studentId, hasBatchAccess: hasBatch }
    });

    return true;
  }

  /**
   * Update Course Enrollment parameters (due date, mandatory status).
   */
  static async updateCourseEnrollment(
    enrollmentId: string, 
    updates: { dueDate?: string | null; isMandatory?: boolean },
    actor: { id: string; email?: string; role?: string }
  ): Promise<Enrollment> {
    const existing = await enrollmentsDb.findOne({ id: enrollmentId });
    if (!existing) throw new Error("Enrollment not found");

    const payload: Partial<Enrollment> = {};
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate;
    if (updates.isMandatory !== undefined) payload.isMandatory = updates.isMandatory;

    const updated = await enrollmentsDb.update(enrollmentId, payload);

    if (updates.dueDate !== undefined && updates.dueDate !== existing.dueDate) {
      await logAuditEvent({
        userId: actor.id,
        userEmail: actor.email,
        userRole: actor.role,
        action: "update_enrollment_due_date",
        resourceType: "course_enrollment",
        resourceId: enrollmentId,
        details: { oldDueDate: existing.dueDate, newDueDate: updates.dueDate }
      });
    }

    if (updates.isMandatory !== undefined && updates.isMandatory !== existing.isMandatory) {
      await logAuditEvent({
        userId: actor.id,
        userEmail: actor.email,
        userRole: actor.role,
        action: "update_enrollment_mandatory_state",
        resourceType: "course_enrollment",
        resourceId: enrollmentId,
        details: { isMandatory: updates.isMandatory }
      });
    }

    return updated as Enrollment;
  }

  // =========================================================================
  // 2. ASSESSMENT ASSIGNMENT (Individual, Bulk, Group, Revocation)
  // =========================================================================

  /**
   * Assign an assessment to an individual student.
   */
  static async assignAssessmentToStudent(options: AssignAssessmentOptions): Promise<AssessmentAssignment> {
    const { 
      assessmentId, studentId, assignedBy, assignedByEmail, assignedByRole,
      dueDate, isMandatory = false, source = "individual", sourceId = null, organizationId = "org-default"
    } = options;

    const assessment = await assessmentsDb.findOne({ id: assessmentId });
    if (!assessment) throw new Error("Assessment not found");

    const student = await usersDb.findOne({ id: studentId });
    if (!student) throw new Error("Student not found");
    if (student.status === "suspended") throw new Error("Cannot assign to suspended student");

    const now = new Date().toISOString();
    const existing = await assessmentAssignmentsDb.findOne({ assessmentId, studentId }, { includeDeleted: true });

    let assignment: AssessmentAssignment;

    if (existing) {
      assignment = await assessmentAssignmentsDb.update(existing.id, {
        status: "assigned",
        assignedBy,
        assignedAt: now,
        dueDate: dueDate || null,
        isMandatory: Boolean(isMandatory),
        assignmentSource: source,
        assignmentSourceId: sourceId || null,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
        deletedAt: null,
        updatedAt: now
      }) as AssessmentAssignment;
    } else {
      assignment = await assessmentAssignmentsDb.insert({
        organizationId: assessment.organizationId || organizationId,
        assessmentId,
        studentId,
        assignedBy,
        assignedAt: now,
        dueDate: dueDate || null,
        status: "assigned",
        isMandatory: Boolean(isMandatory),
        assignmentSource: source,
        assignmentSourceId: sourceId || null,
        createdAt: now,
        updatedAt: now
      });
    }

    await logAuditEvent({
      userId: assignedBy,
      userEmail: assignedByEmail,
      userRole: assignedByRole,
      action: "assign_assessment",
      resourceType: "assessment_assignment",
      resourceId: assignment.id,
      details: {
        assessmentId,
        assessmentTitle: assessment.title,
        studentId,
        studentEmail: student.email,
        source,
        dueDate,
        isMandatory
      }
    });

    // In-app & email notification trigger
    try {
      await NotificationService.notifyAssessmentAssigned(studentId, assessment, {
        dueDate: assignment.dueDate,
        orgId: assessment.organizationId || organizationId
      });
    } catch (err: any) {
      console.error("[Notification] Failed to notify assessment assigned:", err.message);
    }

    return assignment;
  }

  /**
   * Bulk assign an assessment to multiple students.
   */
  static async assignAssessmentBulk(
    assessmentId: string, 
    studentIds: string[], 
    actor: { id: string; email: string; role: string; organizationId?: string },
    options: { dueDate?: string | null; isMandatory?: boolean; source?: AssignmentSource; sourceId?: string | null } = {}
  ): Promise<{ assignedCount: number; results: Array<{ studentId: string; success: boolean; error?: string }> }> {
    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];
    let assignedCount = 0;

    for (const studentId of studentIds) {
      try {
        await this.assignAssessmentToStudent({
          assessmentId,
          studentId,
          assignedBy: actor.id,
          assignedByEmail: actor.email,
          assignedByRole: actor.role,
          dueDate: options.dueDate,
          isMandatory: options.isMandatory,
          source: options.source || "bulk",
          sourceId: options.sourceId || null,
          organizationId: actor.organizationId
        });
        results.push({ studentId, success: true });
        assignedCount++;
      } catch (err: any) {
        results.push({ studentId, success: false, error: err.message });
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "bulk_assign_assessment",
      resourceType: "assessment",
      resourceId: assessmentId,
      details: { totalRequested: studentIds.length, assignedCount }
    });

    return { assignedCount, results };
  }

  /**
   * Assign an assessment to all members of a group.
   */
  static async assignAssessmentToGroup(
    assessmentId: string, 
    groupId: string, 
    actor: { id: string; email: string; role: string; organizationId?: string },
    options: { dueDate?: string | null; isMandatory?: boolean } = {}
  ): Promise<{ assignedCount: number; groupName: string }> {
    const group = await groupsDb.findOne({ id: groupId });
    if (!group) throw new Error("Group not found");

    const members = await groupMembersDb.find({ groupId });
    const studentIds = members.map(m => m.userId);

    const { assignedCount } = await this.assignAssessmentBulk(assessmentId, studentIds, actor, {
      ...options,
      source: "group",
      sourceId: groupId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "group_assign_assessment",
      resourceType: "assessment",
      resourceId: assessmentId,
      details: { groupId, groupName: group.name, assignedCount }
    });

    return { assignedCount, groupName: group.name };
  }

  /**
   * Non-destructive Assessment Revocation:
   * Disables future attempts while preserving past submissions, scorecards, and audit logs.
   */
  static async revokeAssessmentAccess(
    assessmentId: string, 
    studentId: string, 
    actor: { id: string; email?: string; role?: string },
    reason?: string
  ): Promise<boolean> {
    const assignment = await assessmentAssignmentsDb.findOne({ assessmentId, studentId });
    if (!assignment) {
      throw new Error("Active assessment assignment not found for this student");
    }

    const now = new Date().toISOString();
    await assessmentAssignmentsDb.update(assignment.id, {
      status: "revoked",
      revokedAt: now,
      revokedBy: actor.id,
      revocationReason: reason || "Access revoked by administrator",
      updatedAt: now
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "revoke_assessment_access",
      resourceType: "assessment_assignment",
      resourceId: assignment.id,
      details: {
        assessmentId,
        studentId,
        reason: reason || "Access revoked by administrator"
      }
    });

    return true;
  }

  // =========================================================================
  // 3. LEARNING PATH ENROLLMENT (Individual, Bulk, Group, Revocation)
  // =========================================================================

  /**
   * Assign a learning path to a student.
   */
  static async assignLearningPathToStudent(options: AssignLearningPathOptions): Promise<LearningPathAssignment> {
    const { 
      learningPathId, studentId, assignedBy, assignedByEmail, assignedByRole,
      dueDate, isMandatory = false, source = "individual", sourceId = null, organizationId = "org-default"
    } = options;

    const path = await learningPathsDb.findOne({ id: learningPathId });
    if (!path) throw new Error("Learning Path not found");

    const student = await usersDb.findOne({ id: studentId });
    if (!student) throw new Error("Student not found");
    if (student.status === "suspended") throw new Error("Cannot assign to suspended student");

    const now = new Date().toISOString();
    const existing = await learningPathAssignmentsDb.findOne({ learningPathId, studentId }, { includeDeleted: true });

    let assignment: LearningPathAssignment;

    if (existing) {
      assignment = await learningPathAssignmentsDb.update(existing.id, {
        status: existing.completedAt ? "completed" : "assigned",
        assignedBy,
        assignedAt: now,
        dueDate: dueDate || null,
        isMandatory: Boolean(isMandatory),
        assignmentSource: source,
        assignmentSourceId: sourceId || null,
        isDenied: 0 as any,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
        deletedAt: null
      }) as LearningPathAssignment;
    } else {
      assignment = await learningPathAssignmentsDb.insert({
        organizationId: path.organizationId || organizationId,
        learningPathId,
        studentId,
        assignedBy,
        assignedAt: now,
        dueDate: dueDate || null,
        status: "assigned",
        isMandatory: Boolean(isMandatory),
        assignmentSource: source,
        assignmentSourceId: sourceId || null,
        isDenied: 0 as any
      });
    }

    await logAuditEvent({
      userId: assignedBy,
      userEmail: assignedByEmail,
      userRole: assignedByRole,
      action: "assign_learning_path",
      resourceType: "learning_path_assignment",
      resourceId: assignment.id,
      details: {
        learningPathId,
        pathTitle: path.title,
        studentId,
        studentEmail: student.email,
        source,
        dueDate,
        isMandatory
      }
    });

    // In-app & email notification trigger
    try {
      await NotificationService.notifyLearningPathAssigned(studentId, path, {
        dueDate: assignment.dueDate,
        orgId: path.organizationId || organizationId
      });
    } catch (err: any) {
      console.error("[Notification] Failed to notify learning path assigned:", err.message);
    }

    return assignment;
  }

  /**
   * Bulk assign a learning path to multiple students.
   */
  static async assignLearningPathBulk(
    learningPathId: string, 
    studentIds: string[], 
    actor: { id: string; email: string; role: string; organizationId?: string },
    options: { dueDate?: string | null; isMandatory?: boolean; source?: AssignmentSource; sourceId?: string | null } = {}
  ): Promise<{ assignedCount: number; results: Array<{ studentId: string; success: boolean; error?: string }> }> {
    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];
    let assignedCount = 0;

    for (const studentId of studentIds) {
      try {
        await this.assignLearningPathToStudent({
          learningPathId,
          studentId,
          assignedBy: actor.id,
          assignedByEmail: actor.email,
          assignedByRole: actor.role,
          dueDate: options.dueDate,
          isMandatory: options.isMandatory,
          source: options.source || "bulk",
          sourceId: options.sourceId || null,
          organizationId: actor.organizationId
        });
        results.push({ studentId, success: true });
        assignedCount++;
      } catch (err: any) {
        results.push({ studentId, success: false, error: err.message });
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "bulk_assign_learning_path",
      resourceType: "learning_path",
      resourceId: learningPathId,
      details: { totalRequested: studentIds.length, assignedCount }
    });

    return { assignedCount, results };
  }

  /**
   * Assign a learning path to all members of a group.
   */
  static async assignLearningPathToGroup(
    learningPathId: string, 
    groupId: string, 
    actor: { id: string; email: string; role: string; organizationId?: string },
    options: { dueDate?: string | null; isMandatory?: boolean } = {}
  ): Promise<{ assignedCount: number; groupName: string }> {
    const group = await groupsDb.findOne({ id: groupId });
    if (!group) throw new Error("Group not found");

    const members = await groupMembersDb.find({ groupId });
    const studentIds = members.map(m => m.userId);

    const { assignedCount } = await this.assignLearningPathBulk(learningPathId, studentIds, actor, {
      ...options,
      source: "group",
      sourceId: groupId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "group_assign_learning_path",
      resourceType: "learning_path",
      resourceId: learningPathId,
      details: { groupId, groupName: group.name, assignedCount }
    });

    return { assignedCount, groupName: group.name };
  }

  /**
   * Non-destructive Learning Path Revocation (explicit denial).
   */
  static async revokeLearningPathAccess(
    learningPathId: string, 
    studentId: string, 
    actor: { id: string; email?: string; role?: string },
    reason?: string
  ): Promise<boolean> {
    return this.revokeAllStudentLearningPathAccess(learningPathId, studentId, actor, reason);
  }

  /**
   * Explicitly revoke/block all Learning Path access for a student.
   * Sets isDenied = 1, which strictly overrides any batch grants.
   */
  static async revokeAllStudentLearningPathAccess(
    learningPathId: string,
    studentId: string,
    actor: { id: string; email?: string; role?: string },
    reason?: string
  ): Promise<boolean> {
    const path = await learningPathsDb.findOne({ id: learningPathId });
    if (!path) throw new Error("Learning Path not found");

    const now = new Date().toISOString();
    const existing = await learningPathAssignmentsDb.findOne({ learningPathId, studentId }, { includeDeleted: true });

    if (existing) {
      await learningPathAssignmentsDb.update(existing.id, {
        status: "revoked",
        isDenied: 1 as any,
        revokedAt: now,
        revokedBy: actor.id,
        revocationReason: reason || "Access revoked and blocked by administrator",
        deletedAt: null
      });
    } else {
      await learningPathAssignmentsDb.insert({
        organizationId: path.organizationId || "org-default",
        learningPathId,
        studentId,
        assignedBy: actor.id,
        assignedAt: now,
        status: "revoked",
        isDenied: 1 as any,
        assignmentSource: "individual",
        revokedAt: now,
        revokedBy: actor.id,
        revocationReason: reason || "Access revoked and blocked by administrator"
      });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "revoke_all_student_learning_path_access",
      resourceType: "learning_path_assignment",
      resourceId: learningPathId,
      details: {
        learningPathId,
        studentId,
        reason: reason || "Access revoked and blocked by administrator"
      }
    });

    return true;
  }

  /**
   * Remove individual direct assignment from a student.
   * If the student belongs to a batch that has this Learning Path assigned,
   * batch access remains active (isDenied = 0).
   */
  static async removeStudentDirectLearningPathAssignment(
    learningPathId: string,
    studentId: string,
    actor: { id: string; email?: string; role?: string }
  ): Promise<boolean> {
    const existing = await learningPathAssignmentsDb.findOne({ learningPathId, studentId });
    if (existing) {
      const now = new Date().toISOString();
      await learningPathAssignmentsDb.update(existing.id, {
        status: "revoked",
        isDenied: 0 as any,
        deletedAt: now,
        revokedAt: now,
        revokedBy: actor.id,
        revocationReason: "Direct assignment removed by administrator"
      });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "remove_direct_learning_path_assignment",
      resourceType: "learning_path_assignment",
      resourceId: learningPathId,
      details: { learningPathId, studentId }
    });

    return true;
  }

  /**
   * Restore Learning Path access for a student by removing explicit denial.
   * Restores access according to active batch or direct grants without creating duplicate assignments.
   */
  static async restoreStudentLearningPathAccess(
    learningPathId: string,
    studentId: string,
    actor: { id: string; email?: string; role?: string }
  ): Promise<boolean> {
    const existing = await learningPathAssignmentsDb.findOne({ learningPathId, studentId }, { includeDeleted: true });
    if (existing) {
      await learningPathAssignmentsDb.update(existing.id, {
        isDenied: 0 as any,
        status: existing.completedAt ? "completed" : "assigned",
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
        deletedAt: null
      });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "restore_student_learning_path_access",
      resourceType: "learning_path_assignment",
      resourceId: learningPathId,
      details: { learningPathId, studentId }
    });

    return true;
  }

  // =========================================================================
  // 4. GROUP MANAGEMENT
  // =========================================================================

  static async createGroup(data: { name: string; description?: string; organizationId?: string }, actor: { id: string }): Promise<Group> {
    if (!data.name || !data.name.trim()) {
      throw new Error("Group name is required");
    }
    const now = new Date().toISOString();
    const group = await groupsDb.insert({
      organizationId: data.organizationId || "org-default",
      name: data.name.trim(),
      description: data.description?.trim() || "",
      createdAt: now,
      updatedAt: now
    });

    await logAuditEvent({
      userId: actor.id,
      action: "create_group",
      resourceType: "group",
      resourceId: group.id,
      details: { name: group.name }
    });

    return group;
  }

  static async updateGroup(id: string, data: { name?: string; description?: string }, actor: { id: string }): Promise<Group> {
    const existing = await groupsDb.findOne({ id });
    if (!existing) throw new Error("Group not found");

    const now = new Date().toISOString();
    const payload: Partial<Group> = { updatedAt: now };
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.description !== undefined) payload.description = data.description.trim();

    const updated = await groupsDb.update(id, payload);
    return updated as Group;
  }

  static async deleteGroup(id: string, actor: { id: string }): Promise<boolean> {
    const existing = await groupsDb.findOne({ id });
    if (!existing) throw new Error("Group not found");

    const now = new Date().toISOString();
    await groupsDb.update(id, { deletedAt: now });

    await logAuditEvent({
      userId: actor.id,
      action: "delete_group",
      resourceType: "group",
      resourceId: id,
      details: { name: existing.name }
    });

    return true;
  }

  static async addMembersToGroup(groupId: string, userIds: string[], orgId = "org-default"): Promise<{ addedCount: number }> {
    const group = await groupsDb.findOne({ id: groupId });
    if (!group) throw new Error("Group not found");

    const now = new Date().toISOString();
    let addedCount = 0;

    for (const userId of userIds) {
      const existing = await groupMembersDb.findOne({ groupId, userId });
      if (!existing) {
        await groupMembersDb.insert({
          organizationId: group.organizationId || orgId,
          groupId,
          userId,
          addedAt: now
        });
        addedCount++;
      }
    }

    return { addedCount };
  }

  static async removeMemberFromGroup(groupId: string, userId: string): Promise<boolean> {
    const member = await groupMembersDb.findOne({ groupId, userId });
    if (member) {
      await groupMembersDb.delete(member.id);
      return true;
    }
    return false;
  }

  static async getGroups(organizationId?: string): Promise<Group[]> {
    const query = organizationId ? { organizationId } : {};
    const groups = await groupsDb.find(query);
    const members = await groupMembersDb.find(query);

    return groups.map(g => ({
      ...g,
      memberCount: members.filter(m => m.groupId === g.id).length
    }));
  }

  static async getGroupById(id: string): Promise<Group | null> {
    const group = await groupsDb.findOne({ id });
    if (!group) return null;

    const members = await groupMembersDb.find({ groupId: id });
    const userIds = members.map(m => m.userId);
    const users = await usersDb.find();
    const groupUsers = users.filter(u => userIds.includes(u.id));

    return {
      ...group,
      memberCount: members.length,
      members: groupUsers
    };
  }

  // =========================================================================
  // 5. UNIFIED ACCESS VALIDATION & ANTI-BYPASS ENGINE
  // =========================================================================

  /**
   * Check if a student can access a course.
   * Enforces: tenant boundary, lifecycle (draft/review blocking), non-revocation, non-expiration.
   */
  static async checkCourseAccess(studentId: string, courseId: string, userOrgId?: string): Promise<AccessCheckResult> {
    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      return { allowed: false, status: 404, error: "Course not found" };
    }

    // Tenant check
    if (userOrgId && course.organizationId && userOrgId !== course.organizationId) {
      return { allowed: false, status: 403, error: "Access denied. Course belongs to a different organization." };
    }

    // Lifecycle check: students can only access published or archived courses
    if (course.status !== "published" && course.status !== "archived") {
      return { 
        allowed: false, 
        status: 403, 
        error: `This course is currently in "${course.status.toUpperCase()}" status and is not accessible to students.` 
      };
    }

    // Enrollment check
    const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
    let hasBatchAccess = false;
    const [batchRows]: any = await pool.query(`
      SELECT b.id, b.name
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.courseId = ? AND bc.status = 'active'
      WHERE bs.studentId = ?
        AND bs.status = 'active'
        AND b.status = 'active'
        AND b.deletedAt IS NULL
        AND (b.courseId = ? OR bc.courseId = ?)
      LIMIT 1
    `, [courseId, studentId, courseId, courseId]);

    if (batchRows && batchRows.length > 0) {
      hasBatchAccess = true;
    }

    if (!enrollment && !hasBatchAccess) {
      return { 
        allowed: false, 
        status: 403, 
        error: "Access denied. You are not enrolled in this course. Please contact your administrator." 
      };
    }

    // Revocation check: explicit student revocation overrides batch access
    if (enrollment && enrollment.status === "revoked") {
      return { 
        allowed: false, 
        status: 403, 
        error: `Access denied. Your enrollment has been revoked: ${enrollment.revocationReason || "Contact your LMS administrator."}` 
      };
    }

    // Due date & expiration check (if incomplete and overdue)
    if (enrollment.dueDate && new Date(enrollment.dueDate) < new Date() && !enrollment.completedAt && (enrollment.progressPercentage || 0) < 100) {
      return {
        allowed: false,
        status: 403,
        error: `Course assignment expired on ${enrollment.dueDate}. Please contact your administrator for an extension.`
      };
    }

    return { allowed: true, status: 200, enrollment, course };
  }

  /**
   * Check if a student can access an assessment.
   * ANTI-BYPASS: If the assessment belongs to a course, the student MUST have valid course access.
   * Direct URL access without course access is strictly denied.
   */
  static async checkAssessmentAccess(studentId: string, assessmentId: string, userOrgId?: string): Promise<AccessCheckResult> {
    const assessment = await assessmentsDb.findOne({ id: assessmentId });
    if (!assessment) {
      return { allowed: false, status: 404, error: "Assessment not found" };
    }

    if (assessment.status !== "published") {
      return { allowed: false, status: 403, error: "Assessment is not currently published." };
    }

    // Expiration check: global assessment deadline
    if (assessment.dueDate && new Date(assessment.dueDate) < new Date()) {
      return {
        allowed: false,
        status: 403,
        error: `Assessment deadline expired on ${assessment.dueDate}. Submissions are closed.`
      };
    }

    // 1. Check course-attached assessment (Lesson practice test or Course final exam)
    if (assessment.courseId) {
      const courseAccess = await this.checkCourseAccess(studentId, assessment.courseId, userOrgId);
      if (!courseAccess.allowed) {
        return {
          allowed: false,
          status: 403,
          error: `Assessment is part of course "${assessment.courseId}". ${courseAccess.error}`
        };
      }
      return { allowed: true, status: 200, assessment, course: courseAccess.course };
    }

    // 2. Check learning-path-attached assessment
    if (assessment.learningPathId) {
      const pathAccess = await this.checkLearningPathAccess(studentId, assessment.learningPathId, userOrgId);
      if (!pathAccess.allowed) {
        return {
          allowed: false,
          status: 403,
          error: `Assessment is part of Learning Path. ${pathAccess.error}`
        };
      }
      return { allowed: true, status: 200, assessment, learningPath: pathAccess.learningPath };
    }

    // 3. Standalone assessment access
    const assignment = await assessmentAssignmentsDb.findOne({ studentId, assessmentId });
    if (!assignment) {
      return { 
        allowed: false, 
        status: 403, 
        error: "Access denied. You have not been assigned to this assessment. Please contact your administrator." 
      };
    }

    // Revocation check
    if (assignment.status === "revoked") {
      return { 
        allowed: false, 
        status: 403, 
        error: `Access denied. Your assignment has been revoked: ${assignment.revocationReason || "Contact your LMS administrator."}` 
      };
    }

    // Expiration check
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date() && assignment.status !== "completed") {
      return { 
        allowed: false, 
        status: 403, 
        error: `Assessment assignment expired on ${assignment.dueDate}. Submissions are closed.` 
      };
    }

    return { allowed: true, status: 200, assessment, assignment };
  }

  /**
   * Check if a student can access a learning path.
   * Resolves explicit denials, direct assignments, and batch assignments.
   */
  static async checkLearningPathAccess(studentId: string, learningPathId: string, userOrgId?: string): Promise<AccessCheckResult> {
    const path = await learningPathsDb.findOne({ id: learningPathId });
    if (!path) {
      return { allowed: false, status: 404, error: "Learning Path not found" };
    }

    if (path.status !== "published") {
      return { 
        allowed: false, 
        status: 403, 
        error: "This Learning Path is currently unpublished or in preparation. Please check back once your administrator publishes the curriculum.",
        learningPath: path,
        isUnpublished: true
      };
    }

    // 1. Explicit denial check (overrides all direct and batch grants)
    const [denialRows]: any = await pool.query(
      "SELECT * FROM learning_path_assignments WHERE studentId = ? AND learningPathId = ? AND isDenied = 1 AND deletedAt IS NULL",
      [studentId, learningPathId]
    );
    if (denialRows && denialRows.length > 0) {
      const denial = denialRows[0];
      return { 
        allowed: false, 
        status: 403, 
        error: `Access denied. Your access to this Learning Path has been revoked by an administrator.${denial.revocationReason ? ` (${denial.revocationReason})` : ""}`,
        learningPath: path,
        assignment: denial
      };
    }

    // 2. Direct assignment check
    const directAssignment = await learningPathAssignmentsDb.findOne({ studentId, learningPathId });
    let hasValidDirect = false;
    let directExpired = false;

    if (directAssignment && directAssignment.status !== "revoked" && !directAssignment.isDenied) {
      if (directAssignment.dueDate && new Date(directAssignment.dueDate) < new Date() && !directAssignment.completedAt) {
        directExpired = true;
      } else {
        hasValidDirect = true;
      }
    }

    // 3. Batch assignment check
    const [batchRows]: any = await pool.query(`
      SELECT 
        bs.studentId,
        b.id as batchId,
        b.name as batchName,
        b.code as batchCode,
        blp.assignedAt
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
      JOIN batch_learning_paths blp ON blp.batchId = b.id AND blp.status = 'active'
      WHERE bs.studentId = ? AND bs.status = 'active' AND blp.learningPathId = ?
    `, [studentId, learningPathId]);
    const hasValidBatch = batchRows && batchRows.length > 0;

    if (!hasValidDirect && !hasValidBatch) {
      if (directExpired) {
        return { 
          allowed: false, 
          status: 403, 
          error: `Learning Path assignment expired on ${directAssignment?.dueDate}.` 
        };
      }
      return { 
        allowed: false, 
        status: 403, 
        error: "Access denied. You are not assigned to this Learning Path. Please contact your administrator." 
      };
    }

    return { 
      allowed: true, 
      status: 200, 
      learningPath: path, 
      assignment: directAssignment || {
        id: `batch-${batchRows[0].batchId}-${learningPathId}`,
        learningPathId,
        studentId,
        assignedBy: "batch",
        assignedAt: batchRows[0].assignedAt,
        status: "assigned" as any,
        assignmentSource: "batch" as any,
        isDenied: false
      }
    };
  }

  // =========================================================================
  // 6. ADMIN ACCESS INSPECTION MATRICES
  // =========================================================================

  /**
   * Retrieve full access control matrix for a course.
   */
  static async getCourseAccessMatrix(courseId: string, organizationId?: string): Promise<any[]> {
    const enrollments = await enrollmentsDb.find({ courseId });
    const allUsers = await usersDb.find();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    const allGroups = await groupsDb.find();
    const groupMap = new Map(allGroups.map(g => [g.id, g.name]));

    return enrollments.map(enr => {
      const student = userMap.get(enr.studentId);
      const effectiveStatus = this.evaluateAccessStatus(enr);
      const isOverdue = this.isOverdue(enr);

      let sourceLabel = "Individual Assignment";
      if (enr.assignmentSource === "group") {
        const groupName = enr.assignmentSourceId ? groupMap.get(enr.assignmentSourceId) : null;
        sourceLabel = groupName ? `Group: ${groupName}` : "Group Assignment";
      } else if (enr.assignmentSource === "bulk") {
        sourceLabel = "Bulk Assignment";
      } else if (enr.assignmentSource === "learning_path") {
        sourceLabel = "Learning Path Enrollment";
      }

      return {
        enrollmentId: enr.id,
        courseId: enr.courseId,
        studentId: enr.studentId,
        studentName: student ? student.name : "Unknown",
        studentEmail: student ? student.email : "Unknown",
        studentStatus: student ? student.status : "unknown",
        assignedAt: enr.assignedAt || enr.enrolledAt,
        dueDate: enr.dueDate || null,
        isOverdue,
        isMandatory: Boolean(enr.isMandatory),
        status: effectiveStatus,
        rawStatus: enr.status || "assigned",
        progressPercentage: enr.progressPercentage || 0,
        completedAt: enr.completedAt || null,
        assignmentSource: enr.assignmentSource || "individual",
        sourceLabel,
        revokedAt: enr.revokedAt || null,
        revocationReason: enr.revocationReason || null
      };
    });
  }

  /**
   * Retrieve full access control matrix for an assessment.
   */
  static async getAssessmentAccessMatrix(assessmentId: string, organizationId?: string): Promise<any[]> {
    const assignments = await assessmentAssignmentsDb.find({ assessmentId });
    const allUsers = await usersDb.find();
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    const allGroups = await groupsDb.find();
    const groupMap = new Map(allGroups.map(g => [g.id, g.name]));

    const submissions = await submissionsDb.find({ assessmentId });

    return assignments.map(assign => {
      const student = userMap.get(assign.studentId);
      const studentSubs = submissions.filter(s => s.studentId === assign.studentId);
      const effectiveStatus = this.evaluateAccessStatus(assign);
      const isOverdue = this.isOverdue(assign);

      let sourceLabel = "Individual";
      if (assign.assignmentSource === "group") {
        const groupName = assign.assignmentSourceId ? groupMap.get(assign.assignmentSourceId) : null;
        sourceLabel = groupName ? `Group: ${groupName}` : "Group";
      } else if (assign.assignmentSource === "bulk") {
        sourceLabel = "Bulk";
      }

      return {
        assignmentId: assign.id,
        assessmentId: assign.assessmentId,
        studentId: assign.studentId,
        studentName: student ? student.name : "Unknown",
        studentEmail: student ? student.email : "Unknown",
        assignedAt: assign.assignedAt,
        dueDate: assign.dueDate || null,
        isOverdue,
        isMandatory: Boolean(assign.isMandatory),
        status: effectiveStatus,
        rawStatus: assign.status,
        attemptsCount: studentSubs.length,
        bestScore: studentSubs.length > 0 ? Math.max(...studentSubs.map(s => s.percentage || 0)) : null,
        sourceLabel,
        revokedAt: assign.revokedAt || null,
        revocationReason: assign.revocationReason || null
      };
    });
  }

  /**
   * Get all distinct courses accessible to a student (combining active direct individual enrollments
   * and active batch memberships).
   * Handles deduplication, multi-batch access, revoked direct enrollments (preserving batch access),
   * and populates course title, source details, status, and revoke capability.
   */
  static async getStudentEffectiveCourses(studentId: string): Promise<EffectiveCourseAccess[]> {
    // 1. Direct enrollments for the student
    const [directRows]: any = await pool.query(`
      SELECT e.*, c.title as courseTitle, c.category, c.instructorName, c.status as courseStatus
      FROM enrollments e
      LEFT JOIN courses c ON e.courseId = c.id
      WHERE e.studentId = ? AND e.deletedAt IS NULL
    `, [studentId]);

    // 2. Active batch memberships for the student with courses (from batch_courses AND/OR batches.courseId)
    const [batchRows]: any = await pool.query(`
      SELECT 
        bs.studentId,
        bs.enrolledAt as batchEnrolledAt,
        b.id as batchId,
        b.name as batchName,
        b.code as batchCode,
        bc.courseId,
        c.title as courseTitle,
        c.category,
        c.instructorName,
        c.status as courseStatus,
        bc.assignedAt as batchCourseAssignedAt
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
      JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
      LEFT JOIN courses c ON bc.courseId = c.id
      WHERE bs.studentId = ? AND bs.status = 'active' AND c.deletedAt IS NULL
      UNION
      SELECT 
        bs.studentId,
        bs.enrolledAt as batchEnrolledAt,
        b.id as batchId,
        b.name as batchName,
        b.code as batchCode,
        b.courseId,
        c.title as courseTitle,
        c.category,
        c.instructorName,
        c.status as courseStatus,
        b.createdAt as batchCourseAssignedAt
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
      LEFT JOIN courses c ON b.courseId = c.id
      WHERE bs.studentId = ? AND bs.status = 'active' AND b.courseId IS NOT NULL AND b.courseId != '' AND c.deletedAt IS NULL
    `, [studentId, studentId]);

    const courseMap = new Map<string, {
      courseId: string;
      courseTitle: string;
      category: string;
      instructorName: string;
      directEnrollment?: any;
      batches: Array<{ id: string; name: string; code: string; assignedAt: string }>;
    }>();

    for (const r of directRows) {
      if (!r.courseId) continue;
      if (!courseMap.has(r.courseId)) {
        courseMap.set(r.courseId, {
          courseId: r.courseId,
          courseTitle: r.courseTitle || `Course (${r.courseId.slice(0, 8)})`,
          category: r.category || "General",
          instructorName: r.instructorName || "Instructor",
          directEnrollment: r,
          batches: []
        });
      } else {
        courseMap.get(r.courseId)!.directEnrollment = r;
        if (r.courseTitle) courseMap.get(r.courseId)!.courseTitle = r.courseTitle;
        if (r.category) courseMap.get(r.courseId)!.category = r.category;
        if (r.instructorName) courseMap.get(r.courseId)!.instructorName = r.instructorName;
      }
    }

    for (const b of batchRows) {
      if (!b.courseId) continue;
      if (!courseMap.has(b.courseId)) {
        courseMap.set(b.courseId, {
          courseId: b.courseId,
          courseTitle: b.courseTitle || `Course (${b.courseId.slice(0, 8)})`,
          category: b.category || "General",
          instructorName: b.instructorName || "Instructor",
          batches: [{
            id: b.batchId,
            name: b.batchName,
            code: b.batchCode,
            assignedAt: b.batchCourseAssignedAt || b.batchEnrolledAt
          }]
        });
      } else {
        const entry = courseMap.get(b.courseId)!;
        if (!entry.batches.some(existing => existing.id === b.batchId)) {
          entry.batches.push({
            id: b.batchId,
            name: b.batchName,
            code: b.batchCode,
            assignedAt: b.batchCourseAssignedAt || b.batchEnrolledAt
          });
        }
        if (b.courseTitle && entry.courseTitle.startsWith("Course (")) {
          entry.courseTitle = b.courseTitle;
        }
      }
    }

    const results: EffectiveCourseAccess[] = [];

    for (const [courseId, data] of courseMap.entries()) {
      const direct = data.directEnrollment;
      const isExplicitlyRevoked = direct && direct.status === "revoked";
      const hasActiveDirect = direct && direct.status !== "revoked";
      const hasBatch = data.batches.length > 0;

      // Explicit student revocation overrides batch access
      if (isExplicitlyRevoked) {
        continue;
      }

      // If direct is not active and no batch access exists, student does NOT have effective access
      if (!hasActiveDirect && !hasBatch) {
        continue;
      }

      let assignmentSource = "individual";
      let sourceDetails = "Individual Enrollment";
      let canRevoke = true;
      let status = "active";
      let enrolledAt = new Date().toISOString();
      let enrollmentId = direct ? direct.id : `batch-${data.batches[0].id}-${courseId}`;

      if (hasActiveDirect && hasBatch) {
        assignmentSource = "individual_and_batch";
        const batchNames = data.batches.map(b => `${b.name} (${b.code})`).join(", ");
        sourceDetails = `Individual + Batch (${batchNames})`;
        canRevoke = true;
        status = this.evaluateAccessStatus(direct);
        enrolledAt = direct.enrolledAt;
      } else if (hasActiveDirect && !hasBatch) {
        assignmentSource = direct.assignmentSource || "individual";
        sourceDetails = direct.assignmentSource === "bulk" ? "Bulk Assigned" : 
                        direct.assignmentSource === "group" ? "Group Assigned" : "Individual Assignment";
        canRevoke = true;
        status = this.evaluateAccessStatus(direct);
        enrolledAt = direct.enrolledAt;
      } else if (!hasActiveDirect && hasBatch) {
        assignmentSource = "batch";
        const batchNames = data.batches.map(b => `${b.name} (${b.code})`).join(", ");
        sourceDetails = `Batch: ${batchNames}`;
        canRevoke = true;
        status = "active";
        enrolledAt = data.batches[0]?.assignedAt || enrolledAt;
      }

      results.push({
        courseId,
        courseTitle: data.courseTitle,
        category: data.category,
        instructorName: data.instructorName,
        assignmentSource,
        sourceDetails,
        status,
        enrolledAt,
        enrollmentId,
        canRevoke,
        hasDirectAccess: !!hasActiveDirect,
        hasBatchAccess: hasBatch,
        batches: data.batches
      });
    }

    // Sort alphabetically by course title
    return results.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
  }

  /**
   * Get all distinct Learning Paths accessible to a student (combining active direct individual
   * assignments and active batch memberships, while respecting explicit student denials).
   */
  static async getStudentEffectiveLearningPaths(studentId: string): Promise<EffectiveLearningPathAccess[]> {
    // 1. Direct assignments for the student
    const [directRows]: any = await pool.query(`
      SELECT lpa.*, lp.title as learningPathTitle, lp.category, lp.thumbnail, lp.description,
             lp.shortDescription, lp.estimatedDuration, lp.difficulty, lp.status as pathStatus
      FROM learning_path_assignments lpa
      LEFT JOIN learning_paths lp ON lpa.learningPathId = lp.id
      WHERE lpa.studentId = ? AND lpa.deletedAt IS NULL
    `, [studentId]);

    // 2. Active batch memberships for the student with learning paths
    const [batchRows]: any = await pool.query(`
      SELECT 
        bs.studentId,
        bs.enrolledAt as batchEnrolledAt,
        b.id as batchId,
        b.name as batchName,
        b.code as batchCode,
        blp.learningPathId,
        lp.title as learningPathTitle,
        lp.category,
        lp.thumbnail,
        lp.description,
        lp.shortDescription,
        lp.estimatedDuration,
        lp.difficulty,
        lp.status as pathStatus,
        blp.assignedAt as batchAssignedAt
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
      JOIN batch_learning_paths blp ON blp.batchId = b.id AND blp.status = 'active'
      LEFT JOIN learning_paths lp ON blp.learningPathId = lp.id
      WHERE bs.studentId = ? AND bs.status = 'active' AND lp.deletedAt IS NULL
    `, [studentId]);

    const pathMap = new Map<string, {
      learningPathId: string;
      learningPathTitle: string;
      category: string;
      thumbnail?: string;
      description?: string;
      shortDescription?: string;
      estimatedDuration?: string;
      difficulty?: string;
      pathStatus?: string;
      directAssignment?: any;
      batches: Array<{ id: string; name: string; code: string; assignedAt: string }>;
    }>();

    for (const r of directRows) {
      if (!r.learningPathId) continue;
      if (!pathMap.has(r.learningPathId)) {
        pathMap.set(r.learningPathId, {
          learningPathId: r.learningPathId,
          learningPathTitle: r.learningPathTitle || `Learning Path (${r.learningPathId.slice(0, 8)})`,
          category: r.category || "General",
          thumbnail: r.thumbnail,
          description: r.description,
          shortDescription: r.shortDescription,
          estimatedDuration: r.estimatedDuration,
          difficulty: r.difficulty,
          pathStatus: r.pathStatus || "published",
          directAssignment: r,
          batches: []
        });
      } else {
        pathMap.get(r.learningPathId)!.directAssignment = r;
      }
    }

    for (const b of batchRows) {
      if (!b.learningPathId) continue;
      if (!pathMap.has(b.learningPathId)) {
        pathMap.set(b.learningPathId, {
          learningPathId: b.learningPathId,
          learningPathTitle: b.learningPathTitle || `Learning Path (${b.learningPathId.slice(0, 8)})`,
          category: b.category || "General",
          thumbnail: b.thumbnail,
          description: b.description,
          shortDescription: b.shortDescription,
          estimatedDuration: b.estimatedDuration,
          difficulty: b.difficulty,
          pathStatus: b.pathStatus || "published",
          batches: [{
            id: b.batchId,
            name: b.batchName,
            code: b.batchCode,
            assignedAt: b.batchAssignedAt || b.batchEnrolledAt
          }]
        });
      } else {
        const entry = pathMap.get(b.learningPathId)!;
        if (!entry.batches.some(existing => existing.id === b.batchId)) {
          entry.batches.push({
            id: b.batchId,
            name: b.batchName,
            code: b.batchCode,
            assignedAt: b.batchAssignedAt || b.batchEnrolledAt
          });
        }
      }
    }

    const results: EffectiveLearningPathAccess[] = [];

    for (const [learningPathId, data] of pathMap.entries()) {
      const direct = data.directAssignment;
      const isDenied = Boolean(direct && ((direct.isDenied as any) === 1 || direct.isDenied === true));
      const hasActiveDirect = Boolean(direct && direct.status !== "revoked" && !isDenied);
      const hasBatch = data.batches.length > 0;

      // If student has an explicit denial, access is revoked regardless of batch membership
      if (isDenied) {
        results.push({
          learningPathId,
          learningPathTitle: data.learningPathTitle,
          category: data.category,
          thumbnail: data.thumbnail,
          description: data.description,
          shortDescription: data.shortDescription,
          estimatedDuration: data.estimatedDuration,
          difficulty: data.difficulty,
          pathStatus: data.pathStatus || "published",
          assignmentSource: hasBatch ? "batch" : (direct?.assignmentSource || "individual"),
          sourceDetails: hasBatch 
            ? `Explicitly Blocked / Revoked (Batch: ${data.batches.map(b => b.name).join(", ")})` 
            : "Explicitly Blocked / Revoked",
          status: "revoked",
          effectiveStatus: "revoked",
          assignedAt: direct?.assignedAt || new Date().toISOString(),
          dueDate: direct?.dueDate || null,
          isMandatory: Boolean(direct?.isMandatory),
          canRevoke: false,
          hasDirectAccess: false,
          hasBatchAccess: hasBatch,
          isDenied: true,
          batches: data.batches
        });
        continue;
      }

      // If not active direct and no batch, student has no effective access
      if (!hasActiveDirect && !hasBatch) {
        continue;
      }

      let assignmentSource = "individual";
      let sourceDetails = "Individual Assignment";
      let canRevoke = false;
      let status = "active";
      let assignedAt = new Date().toISOString();

      if (hasActiveDirect && hasBatch) {
        assignmentSource = "individual_and_batch";
        const batchNames = data.batches.map(b => `${b.name} (${b.code})`).join(", ");
        sourceDetails = `Individual + Batch (${batchNames})`;
        canRevoke = true;
        status = this.evaluateAccessStatus(direct);
        assignedAt = direct.assignedAt;
      } else if (hasActiveDirect && !hasBatch) {
        assignmentSource = direct.assignmentSource || "individual";
        sourceDetails = direct.assignmentSource === "bulk" ? "Bulk Assigned" :
                        direct.assignmentSource === "group" ? "Group Assigned" : "Individual Assignment";
        canRevoke = true;
        status = this.evaluateAccessStatus(direct);
        assignedAt = direct.assignedAt;
      } else if (!hasActiveDirect && hasBatch) {
        assignmentSource = "batch";
        const batchNames = data.batches.map(b => `${b.name} (${b.code})`).join(", ");
        sourceDetails = `Batch: ${batchNames}`;
        canRevoke = false;
        status = "active";
        assignedAt = data.batches[0]?.assignedAt || assignedAt;
      }

      results.push({
        learningPathId,
        learningPathTitle: data.learningPathTitle,
        category: data.category,
        thumbnail: data.thumbnail,
        description: data.description,
        shortDescription: data.shortDescription,
        estimatedDuration: data.estimatedDuration,
        difficulty: data.difficulty,
        pathStatus: data.pathStatus || "published",
        assignmentSource,
        sourceDetails,
        status,
        effectiveStatus: "active",
        assignedAt,
        dueDate: direct?.dueDate || null,
        isMandatory: Boolean(direct?.isMandatory),
        canRevoke,
        hasDirectAccess: hasActiveDirect,
        hasBatchAccess: hasBatch,
        isDenied: false,
        batches: data.batches
      });
    }

    return results.sort((a, b) => a.learningPathTitle.localeCompare(b.learningPathTitle));
  }

  /**
   * Retrieve student access roster for a specific Learning Path.
   * Details each student's direct, batch, and denial status.
   */
  static async getLearningPathStudentAccessRoster(learningPathId: string): Promise<any[]> {
    const path = await learningPathsDb.findOne({ id: learningPathId });
    if (!path) throw new Error("Learning Path not found");

    const allStudents = await usersDb.find({ role: UserRole.STUDENT });
    const directAssignments = await learningPathAssignmentsDb.find({ learningPathId });
    const allItems = await learningPathItemsDb.find({ learningPathId });
    const allProgress = await learningPathProgressDb.find({ learningPathId });

    // Batch assignments for this learning path
    const [batchRows]: any = await pool.query(`
      SELECT 
        bs.studentId,
        b.id as batchId,
        b.name as batchName,
        b.code as batchCode,
        blp.assignedAt as batchAssignedAt
      FROM batch_learning_paths blp
      JOIN batches b ON blp.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
      JOIN batch_students bs ON bs.batchId = b.id AND bs.status = 'active'
      WHERE blp.learningPathId = ? AND blp.status = 'active'
    `, [learningPathId]);

    const studentBatchMap = new Map<string, Array<{ id: string; name: string; code: string; assignedAt: string }>>();
    for (const br of batchRows) {
      if (!studentBatchMap.has(br.studentId)) {
        studentBatchMap.set(br.studentId, []);
      }
      studentBatchMap.get(br.studentId)!.push({
        id: br.batchId,
        name: br.batchName,
        code: br.code,
        assignedAt: br.batchAssignedAt
      });
    }

    return allStudents.map(student => {
      const assign = directAssignments.find(a => a.studentId === student.id && !a.deletedAt);
      const batches = studentBatchMap.get(student.id) || [];
      const studentProgress = allProgress.filter(p => p.studentId === student.id && p.completed);
      const progressPercent = allItems.length > 0 
        ? Math.round((studentProgress.length / allItems.length) * 100) 
        : 0;

      const isDenied = Boolean(assign && ((assign.isDenied as any) === 1 || assign.isDenied === true));
      const hasDirectAccess = Boolean(assign && assign.status !== "revoked" && !isDenied);
      const hasBatchAccess = batches.length > 0;
      const isEffectiveAssigned = (hasDirectAccess || hasBatchAccess) && !isDenied;

      let assignmentSource = "none";
      let sourceLabel = "Not Assigned";
      if (isDenied) {
        sourceLabel = "Access Blocked / Revoked";
      } else if (hasDirectAccess && hasBatchAccess) {
        assignmentSource = "individual_and_batch";
        sourceLabel = `Direct + Batch (${batches.map(b => b.name).join(", ")})`;
      } else if (hasDirectAccess) {
        assignmentSource = "individual";
        sourceLabel = "Direct Assignment";
      } else if (hasBatchAccess) {
        assignmentSource = "batch";
        sourceLabel = `Batch (${batches.map(b => b.name).join(", ")})`;
      }

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
        isAssigned: isEffectiveAssigned,
        hasDirectAccess,
        hasBatchAccess,
        isDenied,
        assignmentSource,
        sourceLabel,
        batches,
        canRemoveDirect: hasDirectAccess,
        canRevokeAll: isEffectiveAssigned,
        canRestore: isDenied,
        assignedAt: assign?.assignedAt || batches[0]?.assignedAt || null,
        completedAt: assign?.completedAt || null,
        progressPercent
      };
    });
  }

  /**
   * Get comprehensive access roster across all students and courses.
   * Centralizes access calculation, combining active direct enrollments, active batch grants,
   * and explicit per-student revocations/denials.
   */
  static async getFullAccessRoster(): Promise<any[]> {
    const [students]: any = await pool.query(
      `SELECT id, name, email, role, status FROM users WHERE role = 'student' AND status = 'active' ORDER BY name ASC`
    );

    const [publishedCourses]: any = await pool.query(
      `SELECT id, title, category, instructorName, status FROM courses WHERE deletedAt IS NULL ORDER BY title ASC`
    );

    const roster: any[] = [];

    for (const student of students) {
      // 1. Direct enrollments for this student
      const [directRows]: any = await pool.query(`
        SELECT e.*, c.title as courseTitle, c.category, c.instructorName, c.status as courseStatus
        FROM enrollments e
        JOIN courses c ON e.courseId = c.id AND c.deletedAt IS NULL
        WHERE e.studentId = ? AND e.deletedAt IS NULL
      `, [student.id]);

      // 2. Batch courses for this student
      const [batchRows]: any = await pool.query(`
        SELECT 
          bs.studentId, bs.enrolledAt as batchEnrolledAt,
          b.id as batchId, b.name as batchName, b.code as batchCode,
          bc.courseId, c.title as courseTitle, c.category, c.instructorName,
          bc.assignedAt as batchCourseAssignedAt
        FROM batch_students bs
        JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
        JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
        JOIN courses c ON bc.courseId = c.id AND c.deletedAt IS NULL
        WHERE bs.studentId = ? AND bs.status = 'active'
        UNION
        SELECT 
          bs.studentId, bs.enrolledAt as batchEnrolledAt,
          b.id as batchId, b.name as batchName, b.code as batchCode,
          b.courseId, c.title as courseTitle, c.category, c.instructorName,
          b.createdAt as batchCourseAssignedAt
        FROM batch_students bs
        JOIN batches b ON bs.batchId = b.id AND b.status = 'active' AND b.deletedAt IS NULL
        JOIN courses c ON b.courseId = c.id AND c.deletedAt IS NULL
        WHERE bs.studentId = ? AND bs.status = 'active' AND b.courseId IS NOT NULL AND b.courseId != ''
      `, [student.id, student.id]);

      const courseMap = new Map<string, any>();

      for (const d of directRows) {
        if (!d.courseId) continue;
        courseMap.set(d.courseId, {
          courseId: d.courseId,
          courseTitle: d.courseTitle || d.courseId,
          category: d.category || "General",
          instructorName: d.instructorName || "Instructor",
          direct: d,
          batches: []
        });
      }

      for (const b of batchRows) {
        if (!b.courseId) continue;
        if (!courseMap.has(b.courseId)) {
          courseMap.set(b.courseId, {
            courseId: b.courseId,
            courseTitle: b.courseTitle || b.courseId,
            category: b.category || "General",
            instructorName: b.instructorName || "Instructor",
            direct: null,
            batches: [{ id: b.batchId, name: b.batchName, code: b.batchCode, assignedAt: b.batchCourseAssignedAt }]
          });
        } else {
          const entry = courseMap.get(b.courseId)!;
          if (!entry.batches.some((ex: any) => ex.id === b.batchId)) {
            entry.batches.push({ id: b.batchId, name: b.batchName, code: b.batchCode, assignedAt: b.batchCourseAssignedAt });
          }
        }
      }

      for (const [courseId, data] of courseMap.entries()) {
        const direct = data.direct;
        const hasBatch = data.batches.length > 0;
        const isExplicitlyRevoked = direct && direct.status === "revoked";
        const hasActiveDirect = direct && direct.status !== "revoked";

        let accessStatus: "active" | "revoked" = isExplicitlyRevoked ? "revoked" : "active";
        let assignmentSource: "individual" | "batch" | "individual_and_batch" = "individual";
        let sourceDetails = "Individual Enrollment";

        if (hasActiveDirect && hasBatch) {
          assignmentSource = "individual_and_batch";
          sourceDetails = `Individual + Batch (${data.batches.map((b: any) => b.name).join(", ")})`;
        } else if (hasActiveDirect && !hasBatch) {
          assignmentSource = "individual";
          sourceDetails = direct.assignmentSource === "bulk" ? "Bulk Assigned" : "Individual Assignment";
        } else if (!hasActiveDirect && hasBatch && !isExplicitlyRevoked) {
          assignmentSource = "batch";
          sourceDetails = `Batch: ${data.batches.map((b: any) => b.name).join(", ")}`;
        } else if (isExplicitlyRevoked) {
          sourceDetails = hasBatch 
            ? `Batch: ${data.batches.map((b: any) => b.name).join(", ")} (Blocked by explicit override)`
            : "Individual Assignment (Revoked)";
        }

        roster.push({
          id: `${student.id}_${courseId}`,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          courseId,
          courseTitle: data.courseTitle,
          category: data.category,
          instructorName: data.instructorName,
          accessStatus,
          assignmentSource,
          sourceDetails,
          batches: data.batches,
          hasDirectAccess: !!hasActiveDirect,
          hasBatchAccess: hasBatch,
          isExplicitlyRevoked: !!isExplicitlyRevoked,
          canRevoke: !isExplicitlyRevoked,
          canRestore: !!isExplicitlyRevoked,
          assignedAt: direct?.assignedAt || direct?.enrolledAt || data.batches[0]?.assignedAt || null,
          revokedAt: direct?.revokedAt || null,
          revocationReason: direct?.revocationReason || null
        });
      }
    }

    return roster.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.courseTitle.localeCompare(b.courseTitle));
  }
}
