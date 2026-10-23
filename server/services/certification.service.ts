/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import PDFDocument from "pdfkit";
import { 
  certificatesDb, certificateTemplatesDb, coursesDb, modulesDb, lessonsDb, 
  enrollmentsDb, progressDb, assessmentsDb, submissionsDb, 
  learningPathsDb, learningPathItemsDb, learningPathProgressDb, learningPathAssignmentsDb,
  usersDb, organizationsDb
} from "../db.js";
import { Certificate, CertificateStyle, CertificateStatus, User, UserRole } from "../../src/types.js";
import { NotificationService } from "./notification.service.js";

export class CertificationService {
  /**
   * Generates a non-sequential, structured human-readable Certificate Number
   * Format: MR-CRS-2026-A8B9C2 or MR-PTH-2026-F1E2D3
   */
  public static generateCertificateNumber(type: "course" | "learning_path"): string {
    const prefix = type === "course" ? "MR-CRS" : "MR-PTH";
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${prefix}-${year}-${randomHex}`;
  }

  /**
   * Generates a cryptographically secure, non-guessable verification token
   * Format: v_9f2a7bc418e24c5b96d031aa
   */
  public static generateVerificationCode(): string {
    return "v_" + crypto.randomBytes(12).toString("hex");
  }

  /**
   * Verifies if a student genuinely meets all completion requirements for a course
   */
  public static async verifyCourseEligibility(studentId: string, courseId: string): Promise<{
    eligible: boolean;
    reason?: string;
    student?: User;
    course?: any;
    finalSubmission?: any;
    completedLessonsCount?: number;
    totalLessonsCount?: number;
  }> {
    const student = await usersDb.findOne({ id: studentId });
    if (!student) {
      return { eligible: false, reason: "Student record not found." };
    }

    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      return { eligible: false, reason: "Course not found." };
    }

    const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
    if (!enrollment) {
      return { eligible: false, reason: "Student is not enrolled in this course." };
    }

    if (enrollment.status === "revoked" || enrollment.status === "expired") {
      return { eligible: false, reason: `Course access is ${enrollment.status}.` };
    }

    // 1. Calculate lesson completion across published modules and published lessons
    const allModules = await modulesDb.find({ courseId });
    const publishedModuleIds = new Set(
      allModules.filter(m => (m.status || "published") === "published").map(m => m.id)
    );

    const allLessons = await lessonsDb.find({ courseId });
    const publishedLessons = allLessons.filter(
      l => publishedModuleIds.has(l.moduleId) && (l.status || "published") === "published"
    );
    const publishedLessonIds = new Set(publishedLessons.map(l => l.id));

    if (publishedLessons.length === 0) {
      return { eligible: false, reason: "Course contains no published lessons." };
    }

    const studentProgress = await progressDb.find({ studentId, courseId, completed: true });
    const completedPublishedLessons = studentProgress.filter(p => publishedLessonIds.has(p.lessonId));

    if (completedPublishedLessons.length < publishedLessons.length) {
      return {
        eligible: false,
        reason: `Course lessons not fully completed: ${completedPublishedLessons.length}/${publishedLessons.length} finished.`,
        completedLessonsCount: completedPublishedLessons.length,
        totalLessonsCount: publishedLessons.length
      };
    }

    // 2. Check Course Final Assessment if configured
    let finalSubmission: any = null;
    const finalAssessment = await assessmentsDb.findOne({ courseId, type: "course_final" });
    const mustPassAssessment = course.requireFinalAssessment || Boolean(finalAssessment);

    if (mustPassAssessment) {
      const targetAssessmentId = finalAssessment?.id || (course as any).finalAssessmentId;
      if (targetAssessmentId) {
        const passingSub = await submissionsDb.findOne({
          assessmentId: targetAssessmentId,
          studentId,
          passed: true
        });

        if (!passingSub) {
          return {
            eligible: false,
            reason: "Course final assessment has not been passed.",
            completedLessonsCount: completedPublishedLessons.length,
            totalLessonsCount: publishedLessons.length
          };
        }
        finalSubmission = passingSub;
      }
    }

    return {
      eligible: true,
      student,
      course,
      finalSubmission,
      completedLessonsCount: completedPublishedLessons.length,
      totalLessonsCount: publishedLessons.length
    };
  }

  /**
   * Verifies if a student genuinely meets all completion requirements for a learning path
   */
  public static async verifyLearningPathEligibility(studentId: string, learningPathId: string): Promise<{
    eligible: boolean;
    reason?: string;
    student?: User;
    path?: any;
    finalSubmission?: any;
    completedItemsCount?: number;
    totalRequiredItemsCount?: number;
  }> {
    const student = await usersDb.findOne({ id: studentId });
    if (!student) {
      return { eligible: false, reason: "Student record not found." };
    }

    const path = await learningPathsDb.findOne({ id: learningPathId });
    if (!path) {
      return { eligible: false, reason: "Learning path not found." };
    }

    const assignment = await learningPathAssignmentsDb.findOne({ studentId, learningPathId });
    if (!assignment) {
      return { eligible: false, reason: "Student is not enrolled in this learning path." };
    }

    if (assignment.status === "revoked" || assignment.status === "expired") {
      return { eligible: false, reason: `Learning path assignment is ${assignment.status}.` };
    }

    // 1. Calculate item completion
    const allItems = await learningPathItemsDb.find({ learningPathId });
    const reqItems = allItems.filter(it => it.isRequired !== false);

    if (reqItems.length === 0) {
      return { eligible: false, reason: "Learning path has no required items." };
    }

    const studentProgress = await learningPathProgressDb.find({ studentId, learningPathId, completed: true });
    const completedReqItems = studentProgress.filter(p => reqItems.some(ri => ri.id === p.itemId));

    if (completedReqItems.length < reqItems.length) {
      return {
        eligible: false,
        reason: `Learning path items not fully completed: ${completedReqItems.length}/${reqItems.length} finished.`,
        completedItemsCount: completedReqItems.length,
        totalRequiredItemsCount: reqItems.length
      };
    }

    // 2. Check Final Assessment if configured
    let finalSubmission: any = null;
    if (path.finalAssessmentId) {
      const passingSub = await submissionsDb.findOne({
        assessmentId: path.finalAssessmentId,
        studentId,
        passed: true
      });

      if (!passingSub) {
        return {
          eligible: false,
          reason: "Learning path final assessment has not been passed.",
          completedItemsCount: completedReqItems.length,
          totalRequiredItemsCount: reqItems.length
        };
      }
      finalSubmission = passingSub;
    }

    return {
      eligible: true,
      student,
      path,
      finalSubmission,
      completedItemsCount: completedReqItems.length,
      totalRequiredItemsCount: reqItems.length
    };
  }

  /**
   * Issues or returns a certificate for a completed course
   */
  public static async issueCourseCertificate(studentId: string, courseId: string, orgId = "org-default"): Promise<{
    certificate: Certificate;
    isNew: boolean;
  }> {
    const check = await this.verifyCourseEligibility(studentId, courseId);
    if (!check.eligible) {
      throw new Error(check.reason || "Course completion requirements not satisfied.");
    }

    const { student, course, finalSubmission } = check;

    // Check for existing certificate
    const existing = await certificatesDb.findOne({ studentId, courseId, type: "course" });
    if (existing) {
      if (existing.status === "revoked") {
        throw new Error("This certificate was previously revoked. Please contact administration for reissuance.");
      }
      return { certificate: existing, isNew: false };
    }

    // Calculate expiry date if validityMonths is configured
    const now = new Date();
    const issuedAt = now.toISOString();
    let expiresAt: string | null = null;
    if (course.validityMonths && Number(course.validityMonths) > 0) {
      const expDate = new Date(now.getTime() + Number(course.validityMonths) * 30 * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const certificateNumber = this.generateCertificateNumber("course");
    const verificationCode = this.generateVerificationCode();

    const certTitle = course.certificateTitle?.trim() || "Certificate of Course Completion";
      const templateStyle: CertificateStyle = "classic_gold";
      let resolvedStyle: CertificateStyle = templateStyle;
      let signatoryName = course.signatoryName || "Dr. M. R. Tech";
      let signatoryTitle = course.signatoryTitle || "Academic Director, MRTECH LMS";
      let orgName = "MRTECH Learning Academy";

      if (course.certificateTemplateId) {
        const template = await certificateTemplatesDb.findOne({ id: course.certificateTemplateId });
        if (template) {
          resolvedStyle = template.style;
          if (!course.signatoryName && template.defaultSignatoryName) signatoryName = template.defaultSignatoryName;
          if (!course.signatoryTitle && template.defaultSignatoryTitle) signatoryTitle = template.defaultSignatoryTitle;
          if (template.organizationName) orgName = template.organizationName;
        }
      }

    const newCert = await certificatesDb.insert({
      certificateNumber,
      verificationCode,
      organizationId: student!.organizationId || orgId,
      studentId,
      studentName: student!.name,
      studentEmail: student!.email,
      type: "course",
      courseId,
      title: course.title,
      certificateTitle: certTitle,
      templateId: course.certificateTemplateId || null,
      templateStyle: resolvedStyle,
      scorePercentage: finalSubmission?.percentage || 100,
      issuedAt,
      expiresAt,
      status: "active",
      signatoryName,
      signatoryTitle,
      organizationName: orgName,
      metadata: {
        courseCategory: course.category,
        courseDifficulty: course.difficulty,
        completedLessonsCount: check.completedLessonsCount,
        finalAssessmentPassed: !!finalSubmission
      },
      createdAt: issuedAt,
      updatedAt: issuedAt
    });

    // In-app & email notification trigger
    NotificationService.notifyCertificateIssued(studentId, newCert, orgId)
      .catch(err => console.error("[Notification] Failed to notify course certificate issued:", err));

    return { certificate: newCert, isNew: true };
  }

  /**
   * Issues or returns a certificate for a completed learning path
   */
  public static async issueLearningPathCertificate(studentId: string, learningPathId: string, orgId = "org-default"): Promise<{
    certificate: Certificate;
    isNew: boolean;
  }> {
    const check = await this.verifyLearningPathEligibility(studentId, learningPathId);
    if (!check.eligible) {
      throw new Error(check.reason || "Learning path completion requirements not satisfied.");
    }

    const { student, path, finalSubmission } = check;

    // Check for existing certificate
    const existing = await certificatesDb.findOne({ studentId, learningPathId, type: "learning_path" });
    if (existing) {
      if (existing.status === "revoked") {
        throw new Error("This certificate was previously revoked. Please contact administration for reissuance.");
      }
      return { certificate: existing, isNew: false };
    }

    const now = new Date();
    const issuedAt = now.toISOString();
    let expiresAt: string | null = null;
    if (path.validityMonths && Number(path.validityMonths) > 0) {
      const expDate = new Date(now.getTime() + Number(path.validityMonths) * 30 * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const certificateNumber = this.generateCertificateNumber("learning_path");
    const verificationCode = this.generateVerificationCode();

    const certTitle = path.certificateTitle?.trim() || "Certificate of Learning Path Mastery";
    let resolvedStyle: CertificateStyle = "executive_navy";
    let signatoryName = path.signatoryName || "Dr. M. R. Tech";
    let signatoryTitle = path.signatoryTitle || "Head of Career Programs, MRTECH LMS";
    let orgName = "MRTECH Learning Academy";

    if (path.certificateTemplateId) {
      const template = await certificateTemplatesDb.findOne({ id: path.certificateTemplateId });
      if (template) {
        resolvedStyle = template.style;
        if (!path.signatoryName && template.defaultSignatoryName) signatoryName = template.defaultSignatoryName;
        if (!path.signatoryTitle && template.defaultSignatoryTitle) signatoryTitle = template.defaultSignatoryTitle;
        if (template.organizationName) orgName = template.organizationName;
      }
    }

    const newCert = await certificatesDb.insert({
      certificateNumber,
      verificationCode,
      organizationId: student!.organizationId || orgId,
      studentId,
      studentName: student!.name,
      studentEmail: student!.email,
      type: "learning_path",
      learningPathId,
      title: path.title,
      certificateTitle: certTitle,
      templateId: path.certificateTemplateId || null,
      templateStyle: resolvedStyle,
      scorePercentage: finalSubmission?.percentage || 100,
      issuedAt,
      expiresAt,
      status: "active",
      signatoryName,
      signatoryTitle,
      organizationName: orgName,
      metadata: {
        pathCategory: path.category,
        pathDifficulty: path.difficulty,
        completedItemsCount: check.completedItemsCount
      },
      createdAt: issuedAt,
      updatedAt: issuedAt
    });

    // In-app & email notification trigger
    NotificationService.notifyCertificateIssued(studentId, newCert, orgId)
      .catch(err => console.error("[Notification] Failed to notify learning path certificate issued:", err));

    return { certificate: newCert, isNew: true };
  }

  /**
   * Revoke a certificate
   */
  public static async revokeCertificate(certificateId: string, revokedBy: User, reason: string): Promise<Certificate> {
    const cert = await certificatesDb.findOne({ id: certificateId });
    if (!cert) throw new Error("Certificate not found.");

    const now = new Date().toISOString();
    const updated = await certificatesDb.update(cert.id, {
      status: "revoked",
      revokedAt: now,
      revokedBy: revokedBy.id,
      revocationReason: reason?.trim() || "Revoked by administrator.",
      updatedAt: now
    });

    return updated!;
  }

  /**
   * Reissue / Restore a revoked certificate
   */
  public static async reissueCertificate(
    certificateId: string, 
    adminUser: User, 
    options?: { validityMonths?: number; reason?: string }
  ): Promise<Certificate> {
    const cert = await certificatesDb.findOne({ id: certificateId });
    if (!cert) throw new Error("Certificate not found.");

    const now = new Date();
    const issuedAt = now.toISOString();
    let expiresAt = cert.expiresAt;

    if (options?.validityMonths && Number(options.validityMonths) > 0) {
      expiresAt = new Date(now.getTime() + Number(options.validityMonths) * 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const updated = await certificatesDb.update(cert.id, {
      status: "active",
      issuedAt,
      expiresAt,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      updatedAt: issuedAt
    });

    return updated!;
  }

  /**
   * Seed default templates if none exist
   */
  public static async ensureDefaultTemplates(): Promise<void> {
    const existing = await certificateTemplatesDb.find({});
    if (existing.length > 0) return;

    const now = new Date().toISOString();
    const defaults = [
      {
        id: "tmpl-classic-gold",
        organizationId: "org-default",
        name: "Classic Gold Honor",
        description: "Prestigious traditional certificate design with warm gold accents and royal borders",
        style: "classic_gold" as CertificateStyle,
        primaryColor: "#1E3A8A",
        accentColor: "#D97706",
        badgeIcon: "award",
        borderStyle: "ornate",
        defaultSignatoryName: "Dr. M. R. Tech",
        defaultSignatoryTitle: "Director of Academic Affairs",
        organizationName: "MRTECH Learning Academy",
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tmpl-modern-emerald",
        organizationId: "org-default",
        name: "Modern Emerald Achievement",
        description: "Contemporary clean design featuring vibrant emerald tones for practical competencies",
        style: "modern_emerald" as CertificateStyle,
        primaryColor: "#064E3B",
        accentColor: "#10B981",
        badgeIcon: "check-circle",
        borderStyle: "clean",
        defaultSignatoryName: "Dr. M. R. Tech",
        defaultSignatoryTitle: "Dean of Practical Studies",
        organizationName: "MRTECH Learning Academy",
        isDefault: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tmpl-executive-navy",
        organizationId: "org-default",
        name: "Executive Navy Professional",
        description: "Formal executive layout with deep navy and vibrant cobalt highlights for career paths",
        style: "executive_navy" as CertificateStyle,
        primaryColor: "#0F172A",
        accentColor: "#3B82F6",
        badgeIcon: "shield-check",
        borderStyle: "geometric",
        defaultSignatoryName: "Dr. M. R. Tech",
        defaultSignatoryTitle: "Executive Program Director",
        organizationName: "MRTECH Learning Academy",
        isDefault: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "tmpl-tech-violet",
        organizationId: "org-default",
        name: "Tech Violet Innovation",
        description: "Futuristic violet design crafted for software engineering and technical tracks",
        style: "tech_violet" as CertificateStyle,
        primaryColor: "#4C1D95",
        accentColor: "#8B5CF6",
        badgeIcon: "cpu",
        borderStyle: "modern",
        defaultSignatoryName: "Dr. M. R. Tech",
        defaultSignatoryTitle: "Head of Technology & Innovation",
        organizationName: "MRTECH Learning Academy",
        isDefault: false,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const t of defaults) {
      await certificateTemplatesDb.insert(t);
    }
  }

  /**
   * Retrieves certificate templates
   */
  public static async getTemplates(organizationId = "org-default") {
    await this.ensureDefaultTemplates();
    return await certificateTemplatesDb.find({ organizationId });
  }

  /**
   * Look up certificate by ID with automatic expiration check
   */
  public static async getCertificateById(id: string): Promise<Certificate | null> {
    const cert = await certificatesDb.findOne({ id });
    if (!cert) return null;

    if (cert.status === "active" && cert.expiresAt && new Date(cert.expiresAt).getTime() < Date.now()) {
      await certificatesDb.update(cert.id, { status: "expired", updatedAt: new Date().toISOString() });
      cert.status = "expired";
    }

    return cert;
  }

  /**
   * Look up certificate by verification code or certificate number with automatic expiration check
   */
  public static async getCertificateByCode(codeOrNumber: string): Promise<Certificate | null> {
    let cert = await certificatesDb.findOne({ verificationCode: codeOrNumber });
    if (!cert) {
      cert = await certificatesDb.findOne({ certificateNumber: codeOrNumber });
    }
    if (!cert) return null;

    if (cert.status === "active" && cert.expiresAt && new Date(cert.expiresAt).getTime() < Date.now()) {
      await certificatesDb.update(cert.id, { status: "expired", updatedAt: new Date().toISOString() });
      cert.status = "expired";
    }

    return cert;
  }

  /**
   * Public certificate verification lookup - STRICTLY masks private PII (no email, no studentId, no tenantId)
   */
  public static async getPublicCertificate(codeOrNumber: string): Promise<{
    found: boolean;
    verification?: any;
    error?: string;
  }> {
    const cert = await this.getCertificateByCode(codeOrNumber);
    if (!cert) {
      return { found: false, error: "No certificate found matching the provided identification code." };
    }

    return {
      found: true,
      verification: {
        valid: cert.status === "active",
        status: cert.status,
        certificateNumber: cert.certificateNumber,
        recipientName: cert.studentName, // Public verification displays only recipient name
        title: cert.title,
        certificateTitle: cert.certificateTitle,
        type: cert.type,
        organizationName: cert.organizationName,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt || null,
        signatoryName: cert.signatoryName,
        signatoryTitle: cert.signatoryTitle,
        revokedAt: cert.revokedAt || null,
        revocationReason: cert.revokedAt ? cert.revocationReason : null
      }
    };
  }

  /**
   * Retrieve all certificates for a student
   */
  public static async getStudentCertificates(studentId: string): Promise<Certificate[]> {
    const list = await certificatesDb.find({ studentId });
    const now = Date.now();
    for (const cert of list) {
      if (cert.status === "active" && cert.expiresAt && new Date(cert.expiresAt).getTime() < now) {
        await certificatesDb.update(cert.id, { status: "expired", updatedAt: new Date().toISOString() });
        cert.status = "expired";
      }
    }
    return list.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  /**
   * Retrieve certificates for admin with filtering, searching, and aggregate statistics
   */
  public static async getAdminCertificates(filters: {
    search?: string;
    status?: string;
    type?: string;
    courseId?: string;
    learningPathId?: string;
    organizationId?: string;
  }): Promise<{
    certificates: Certificate[];
    stats: {
      total: number;
      active: number;
      revoked: number;
      expired: number;
      courseCount: number;
      pathCount: number;
    };
  }> {
    let list = await certificatesDb.find(filters.organizationId ? { organizationId: filters.organizationId } : {});
    const now = Date.now();

    // Check expiration on all active certificates
    for (const cert of list) {
      if (cert.status === "active" && cert.expiresAt && new Date(cert.expiresAt).getTime() < now) {
        await certificatesDb.update(cert.id, { status: "expired", updatedAt: new Date().toISOString() });
        cert.status = "expired";
      }
    }

    const stats = {
      total: list.length,
      active: list.filter(c => c.status === "active").length,
      revoked: list.filter(c => c.status === "revoked").length,
      expired: list.filter(c => c.status === "expired").length,
      courseCount: list.filter(c => c.type === "course").length,
      pathCount: list.filter(c => c.type === "learning_path").length,
    };

    if (filters.status && filters.status !== "all") {
      list = list.filter(c => c.status === filters.status);
    }

    if (filters.type && filters.type !== "all") {
      list = list.filter(c => c.type === filters.type);
    }

    if (filters.courseId) {
      list = list.filter(c => c.courseId === filters.courseId);
    }

    if (filters.learningPathId) {
      list = list.filter(c => c.learningPathId === filters.learningPathId);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(c => 
        c.studentName.toLowerCase().includes(q) ||
        c.studentEmail.toLowerCase().includes(q) ||
        c.certificateNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.verificationCode.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    return { certificates: list, stats };
  }

  /**
   * Generates a high-quality PDF Buffer using PDFKit
   */
  public static generatePdfBuffer(cert: Certificate, baseUrl = "http://localhost:3000"): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          layout: "landscape",
          size: "A4",
          margins: { top: 20, bottom: 20, left: 20, right: 20 }
        });

        const chunks: Buffer[] = [];
        doc.on("data", chunk => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Dimensions for A4 landscape: 841.89 x 595.28
        const width = 841.89;
        const height = 595.28;

        // Palette mapping by style
        const palettes: Record<CertificateStyle, { border: string; accent: string; title: string; text: string }> = {
          classic_gold: { border: "#B45309", accent: "#D97706", title: "#1E3A8A", text: "#1F2937" },
          modern_emerald: { border: "#047857", accent: "#10B981", title: "#064E3B", text: "#1F2937" },
          executive_navy: { border: "#1E3A8A", accent: "#3B82F6", title: "#0F172A", text: "#1F2937" },
          tech_violet: { border: "#6D28D9", accent: "#8B5CF6", title: "#4C1D95", text: "#1F2937" }
        };

        const colors = palettes[cert.templateStyle] || palettes.classic_gold;

        // 1. Background Fill
        doc.rect(0, 0, width, height).fill("#FAFAFA");

        // 2. Outer Ornamental Border
        doc.rect(20, 20, width - 40, height - 40)
           .lineWidth(4)
           .stroke(colors.border);

        // 3. Inner Decorative Border
        doc.rect(28, 28, width - 56, height - 56)
           .lineWidth(1)
           .stroke(colors.accent);

        // Corner decorative accents
        const cornerSize = 25;
        // Top-left
        doc.moveTo(28, 28 + cornerSize).lineTo(28 + cornerSize, 28).lineWidth(2).stroke(colors.border);
        // Top-right
        doc.moveTo(width - 28 - cornerSize, 28).lineTo(width - 28, 28 + cornerSize).lineWidth(2).stroke(colors.border);
        // Bottom-left
        doc.moveTo(28, height - 28 - cornerSize).lineTo(28 + cornerSize, height - 28).lineWidth(2).stroke(colors.border);
        // Bottom-right
        doc.moveTo(width - 28 - cornerSize, height - 28).lineTo(width - 28, height - 28 - cornerSize).lineWidth(2).stroke(colors.border);

        // 4. Header: Organization Name
        doc.fontSize(14)
           .font("Helvetica-Bold")
           .fillColor(colors.accent)
           .text((cert.organizationName || "MRTECH LEARNING ACADEMY").toUpperCase(), 0, 55, {
             align: "center",
             characterSpacing: 2
           });

        // 5. Certificate Main Title
        doc.fontSize(28)
           .font("Times-Bold")
           .fillColor(colors.title)
           .text(cert.certificateTitle.toUpperCase(), 0, 85, {
             align: "center",
             characterSpacing: 1.5
           });

        // 6. Subtitle "This is to certify that"
        doc.fontSize(12)
           .font("Helvetica-Oblique")
           .fillColor("#4B5563")
           .text("This official credential is hereby presented to", 0, 135, { align: "center" });

        // 7. Student Name
        doc.fontSize(32)
           .font("Times-BoldItalic")
           .fillColor(colors.title)
           .text(cert.studentName, 0, 165, { align: "center" });

        // Decorative line beneath name
        const lineWidth = 360;
        doc.moveTo((width - lineWidth) / 2, 210)
           .lineTo((width + lineWidth) / 2, 210)
           .lineWidth(1.5)
           .stroke(colors.accent);

        // 8. Description / Achievement Text
        doc.fontSize(12)
           .font("Helvetica")
           .fillColor("#4B5563")
           .text("for successfully fulfilling all rigorous curricular requirements and mastering", 0, 225, { align: "center" });

        // 9. Course or Learning Path Title
        doc.fontSize(22)
           .font("Times-Bold")
           .fillColor(colors.title)
           .text(cert.title, 60, 250, { align: "center" });

        if (cert.scorePercentage) {
          doc.fontSize(11)
             .font("Helvetica-Bold")
             .fillColor(colors.accent)
             .text(`Evaluated with an overall score of ${cert.scorePercentage}%`, 0, 285, { align: "center" });
        }

        // 10. Watermark / Stamp if Revoked
        if (cert.status === "revoked") {
          doc.save();
          doc.rotate(-20, { origin: [width / 2, height / 2] });
          doc.fontSize(60)
             .font("Helvetica-Bold")
             .fillColor("#EF4444")
             .opacity(0.35)
             .text("REVOKED", width / 2 - 150, height / 2 - 30);
          doc.restore();
        }

        // 11. Signatures & Metadata Section (Bottom)
        const bottomY = 385;

        // Left column: Issue Date & Expiry
        const issueDateStr = new Date(cert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const expiryDateStr = cert.expiresAt 
          ? new Date(cert.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : "Lifetime Validity";

        doc.fontSize(9)
           .font("Helvetica")
           .fillColor("#6B7280")
           .text("DATE OF ISSUANCE", 80, bottomY, { width: 200, align: "left" });
        doc.fontSize(11)
           .font("Helvetica-Bold")
           .fillColor(colors.text)
           .text(issueDateStr, 80, bottomY + 14, { width: 200, align: "left" });

        doc.fontSize(9)
           .font("Helvetica")
           .fillColor("#6B7280")
           .text("VALIDITY", 80, bottomY + 36, { width: 200, align: "left" });
        doc.fontSize(11)
           .font("Helvetica-Bold")
           .fillColor(colors.text)
           .text(expiryDateStr, 80, bottomY + 50, { width: 200, align: "left" });

        // Center column: Medallion Seal
        const sealX = width / 2;
        const sealY = bottomY + 25;
        doc.circle(sealX, sealY, 32).lineWidth(2).stroke(colors.accent);
        doc.circle(sealX, sealY, 28).lineWidth(1).stroke(colors.border);
        doc.fontSize(8)
           .font("Helvetica-Bold")
           .fillColor(colors.accent)
           .text("OFFICIAL", sealX - 30, sealY - 10, { width: 60, align: "center" });
        doc.fontSize(8)
           .font("Helvetica-Bold")
           .fillColor(colors.title)
           .text("VERIFIED", sealX - 30, sealY + 2, { width: 60, align: "center" });

        // Right column: Signatory
        const rightX = width - 280;
        doc.moveTo(rightX, bottomY + 30).lineTo(rightX + 200, bottomY + 30).lineWidth(1).stroke("#9CA3AF");
        doc.fontSize(12)
           .font("Times-Bold")
           .fillColor(colors.title)
           .text(cert.signatoryName, rightX, bottomY + 36, { width: 200, align: "center" });
        doc.fontSize(9)
           .font("Helvetica")
           .fillColor("#6B7280")
           .text(cert.signatoryTitle, rightX, bottomY + 52, { width: 200, align: "center" });

        // 12. Footer: Certificate ID & Verification URL
        const verifyUrl = `${baseUrl}/verify-certificate?code=${cert.verificationCode}`;
        const footerY = height - 48;

        doc.fontSize(8)
           .font("Helvetica-Bold")
           .fillColor("#6B7280")
           .text(`CERTIFICATE ID: ${cert.certificateNumber}`, 40, footerY);

        doc.fontSize(8)
           .font("Helvetica")
           .fillColor("#4B5563")
           .text(`Verify online: ${verifyUrl}`, 40, footerY + 12);

        doc.fontSize(8)
           .font("Helvetica")
           .fillColor("#9CA3AF")
           .text(`Status: ${cert.status.toUpperCase()}`, width - 200, footerY + 12, { width: 160, align: "right" });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
