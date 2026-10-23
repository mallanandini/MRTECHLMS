/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import multer from "multer";
import { BatchService } from "../services/batch.service.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

export const batchRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max for Excel
});

// =========================================================================
// 1. INSTITUTIONS ROUTES
// =========================================================================

// GET /api/admin/institutions
batchRouter.get("/admin/institutions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const institutions = await BatchService.getInstitutions(orgId);
    res.json(institutions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/institutions
batchRouter.post("/admin/institutions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, contactEmail, contactPhone, address, academicYears } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Institution name is required" });
    if (!code || !code.trim()) return res.status(400).json({ error: "Institution code is required" });

    const institution = await BatchService.createInstitution({
      name,
      code,
      contactEmail,
      contactPhone,
      address,
      academicYears,
      organizationId: req.user!.organizationId
    }, req.user!);

    res.status(201).json(institution);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/institutions/:id
batchRouter.get("/admin/institutions/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const institution = await BatchService.getInstitutionById(req.params.id);
    if (!institution) return res.status(404).json({ error: "Institution not found" });
    res.json(institution);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/institutions/:id
batchRouter.put("/admin/institutions/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await BatchService.updateInstitution(req.params.id, req.body, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/institutions/:id
batchRouter.delete("/admin/institutions/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await BatchService.deleteInstitution(req.params.id, req.user!);
    res.json({ success: true, message: "Institution archived successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 2. EXCEL BULK TEMPLATES & IMPORT (Placed before /:id routes to avoid conflict)
// =========================================================================

// GET /api/batches/template & /api/admin/batches/excel/template
batchRouter.get(["/batches/template", "/admin/batches/excel/template"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const buffer = await BatchService.generateBatchTemplate(orgId);
    res.setHeader("Content-Disposition", 'attachment; filename="batch_import_template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/import & /api/admin/batches/excel/import
// Supports:
// 1. Direct Excel file upload ('file' multipart field)
// 2. JSON body with { rows: [...] } or { batches: [...] }
batchRouter.post(["/batches/import", "/admin/batches/excel/import"], authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    let rowsToImport: any[] = [];

    if (req.file && req.file.buffer) {
      // Validate uploaded Excel
      const validation = await BatchService.validateBatchExcel(req.file.buffer, orgId);
      if (req.query.preview === "true") {
        return res.json(validation);
      }
      if (validation.validCount === 0) {
        return res.status(400).json({
          error: "No valid rows found in uploaded Excel file.",
          details: validation.rows.filter(r => !r.isValid)
        });
      }
      rowsToImport = validation.rows.filter(r => r.isValid);
    } else if (req.body.rows && Array.isArray(req.body.rows)) {
      rowsToImport = req.body.rows;
    } else if (req.body.batches && Array.isArray(req.body.batches)) {
      rowsToImport = req.body.batches.map((b: any) => ({
        name: b.batch_name || b.name,
        institutionCode: b.institution || b.institutionCode,
        academicYear: b.year || b.academicYear,
        description: b.description,
        code: b.code || b.batch_code,
        isValid: true,
        errors: []
      }));
    } else {
      return res.status(400).json({
        error: "Please upload an Excel file ('file' form field) or provide a JSON body with 'rows' or 'batches' array."
      });
    }

    const result = await BatchService.importBatches(rowsToImport, req.user!);
    res.json({
      success: true,
      importedCount: result.importedCount,
      batches: result.batches
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/batches/excel/preview
batchRouter.post("/admin/batches/excel/preview", authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }
    const orgId = req.user!.organizationId || "org-default";
    const result = await BatchService.validateBatchExcel(req.file.buffer, orgId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/batches/excel/student-template
batchRouter.get("/admin/batches/excel/student-template", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const buffer = await BatchService.generateStudentAssignTemplate(orgId);
    res.setHeader("Content-Disposition", 'attachment; filename="student_batch_assignment_template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/batches/excel/student-preview
batchRouter.post("/admin/batches/excel/student-preview", authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }
    const orgId = req.user!.organizationId || "org-default";
    const result = await BatchService.validateStudentAssignExcel(req.file.buffer, orgId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/batches/excel/student-import
batchRouter.post("/admin/batches/excel/student-import", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No valid rows provided for assignment" });
    }
    const result = await BatchService.importStudentAssignments(rows, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 3. BULK ASSIGNMENT APIS (STUDENTS & COURSES)
// =========================================================================

// POST /api/batches/assign-students
// Enforces:
// - One student can belong to multiple batches
// - One batch can contain multiple students
batchRouter.post("/batches/assign-students", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await BatchService.assignStudentsBulk(req.body, req.user!);
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/batches/assign-courses
// Enforces:
// - One batch can have multiple courses
// - Course access synchronization for batch members
batchRouter.post("/batches/assign-courses", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await BatchService.assignCoursesBulk(req.body, req.user!);
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 4. BATCHES CRUD & HIERARCHY ROUTES
// =========================================================================

// GET /api/batches/hierarchy
// Explicit shortcut for Academic Tree hierarchy
batchRouter.get("/batches/hierarchy", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const tree = await BatchService.getBatchesHierarchy(orgId);
    res.json({ success: true, hierarchy: tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches & /api/admin/batches
// Supports query params: hierarchy=true, institutionId, academicYear, year, status, search
batchRouter.get(["/batches", "/admin/batches"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { institutionId, academicYear, year, status, search, limit, offset, hierarchy, format } = req.query;
    const orgId = req.user!.organizationId || "org-default";

    if (hierarchy === "true" || format === "hierarchy") {
      const tree = await BatchService.getBatchesHierarchy(orgId);
      return res.json({ success: true, hierarchy: tree });
    }

    const result = await BatchService.getBatches({
      orgId,
      institutionId: institutionId as string,
      academicYear: (academicYear || year) as string,
      status: status as string,
      search: search as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });

    // Embed hierarchy alongside flat list
    const tree = await BatchService.getBatchesHierarchy(orgId);

    res.json({
      ...result,
      hierarchy: tree
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches & /api/admin/batches
// Supports batch_name, institution (name/code/id), year/academicYear, description, courseIds, studentIds
batchRouter.post(["/batches", "/admin/batches"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      batch_name,
      code,
      batch_code,
      institution,
      institutionId,
      year,
      academicYear,
      courseId,
      courseIds,
      studentIds,
      startDate,
      endDate,
      maxStudents,
      description
    } = req.body;

    const finalName = (name || batch_name || "").trim();
    const finalInst = institution || institutionId;
    const finalYear = (academicYear || year || "").trim();

    if (!finalName) return res.status(400).json({ error: "Batch name (batch_name) is required" });
    if (!finalInst) return res.status(400).json({ error: "Institution is required" });
    if (!finalYear) return res.status(400).json({ error: "Year (year/academicYear) is required" });

    const batch = await BatchService.createBatch({
      name: finalName,
      code: code || batch_code,
      institution: finalInst,
      academicYear: finalYear,
      courseId: courseId || (Array.isArray(courseIds) ? courseIds[0] : undefined),
      courseIds: Array.isArray(courseIds) ? courseIds : (courseId ? [courseId] : undefined),
      studentIds: Array.isArray(studentIds) ? studentIds : undefined,
      startDate,
      endDate,
      maxStudents,
      description,
      organizationId: req.user!.organizationId
    }, req.user!);

    res.status(201).json(batch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/batches/:id & /api/admin/batches/:id
batchRouter.get(["/batches/:id", "/admin/batches/:id"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const batch = await BatchService.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    res.json(batch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/batches/:id & /api/admin/batches/:id
batchRouter.put(["/batches/:id", "/admin/batches/:id"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await BatchService.updateBatch(req.params.id, req.body, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/batches/:id & /api/admin/batches/:id
batchRouter.delete(["/batches/:id", "/admin/batches/:id"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    await BatchService.deleteBatch(req.params.id, req.user!);
    res.json({ success: true, message: "Batch archived successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 5. BATCH STUDENTS (MULTI-BATCH MEMBERSHIP)
// =========================================================================

// GET /api/batches/:id/students & /api/admin/batches/:id/students
batchRouter.get(["/batches/:id/students", "/admin/batches/:id/students"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const students = await BatchService.getBatchStudents(req.params.id);
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/students & /api/admin/batches/:id/students
batchRouter.post(["/batches/:id/students", "/admin/batches/:id/students"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "Student ID is required" });

    const student = await BatchService.addStudentToBatch(req.params.id, studentId, req.user!);
    res.status(201).json(student);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/batches/:id/students/:studentId & /api/admin/batches/:id/students/:studentId
batchRouter.delete(["/batches/:id/students/:studentId", "/admin/batches/:id/students/:studentId"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    await BatchService.removeStudentFromBatch(req.params.id, req.params.studentId, req.user!);
    res.json({ success: true, message: "Student removed from batch successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 6. BATCH COURSES & ASSESSMENTS
// =========================================================================

// GET /api/batches/:id/courses & /api/admin/batches/:id/courses
batchRouter.get(["/batches/:id/courses", "/admin/batches/:id/courses"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courses = await BatchService.getBatchCourses(req.params.id);
    res.json(courses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/courses & /api/admin/batches/:id/courses
batchRouter.post(["/batches/:id/courses", "/admin/batches/:id/courses"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: "Course ID is required" });

    const course = await BatchService.assignCourseToBatch(req.params.id, courseId, req.user!);
    res.status(201).json(course);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/batches/:id/courses/:courseId & /api/admin/batches/:id/courses/:courseId
batchRouter.delete(["/batches/:id/courses/:courseId", "/admin/batches/:id/courses/:courseId"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    await BatchService.revokeCourseFromBatch(req.params.id, req.params.courseId, req.user!);
    res.json({ success: true, message: "Course removed from batch successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/batches/:id/assessments & /api/admin/batches/:id/assessments
batchRouter.get(["/batches/:id/assessments", "/admin/batches/:id/assessments"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const assessments = await BatchService.getBatchAssessments(req.params.id);
    res.json(assessments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/assessments & /api/admin/batches/:id/assessments
batchRouter.post(["/batches/:id/assessments", "/admin/batches/:id/assessments"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { assessmentId } = req.body;
    if (!assessmentId) return res.status(400).json({ error: "Assessment ID is required" });

    const assessment = await BatchService.assignAssessmentToBatch(req.params.id, assessmentId, req.user!);
    res.status(201).json(assessment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/batches/:id/assessments/:assessmentId & /api/admin/batches/:id/assessments/:assessmentId
batchRouter.delete(["/batches/:id/assessments/:assessmentId", "/admin/batches/:id/assessments/:assessmentId"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    await BatchService.revokeAssessmentFromBatch(req.params.id, req.params.assessmentId, req.user!);
    res.json({ success: true, message: "Assessment removed from batch successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/batches/:id/learning-paths & /api/admin/batches/:id/learning-paths
batchRouter.get(["/batches/:id/learning-paths", "/admin/batches/:id/learning-paths"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const paths = await BatchService.getBatchLearningPaths(req.params.id);
    res.json(paths);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/learning-paths & /api/admin/batches/:id/learning-paths
batchRouter.post(["/batches/:id/learning-paths", "/admin/batches/:id/learning-paths"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { learningPathId } = req.body;
    if (!learningPathId) return res.status(400).json({ error: "learningPathId is required" });
    const record = await BatchService.assignLearningPathToBatch(req.params.id, learningPathId, req.user!);
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/batches/:id/learning-paths/:learningPathId & /api/admin/batches/:id/learning-paths/:learningPathId
batchRouter.delete(["/batches/:id/learning-paths/:learningPathId", "/admin/batches/:id/learning-paths/:learningPathId"], authenticateToken, requireAdmin, async (req, res) => {
  try {
    await BatchService.revokeLearningPathFromBatch(req.params.id, req.params.learningPathId, req.user!);
    res.json({ success: true, message: "Learning Path removed from batch successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 7. STUDENT PORTAL INTEGRATION
// =========================================================================

// GET /api/student/batches & /api/student/my-batches
// Returns enrolled batches with assigned courses embedded
batchRouter.get(["/student/batches", "/student/my-batches"], authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const batches = await BatchService.getStudentBatches(studentId);
    res.json({ success: true, batches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/batch-courses
// Returns all courses across all enrolled batches
batchRouter.get("/student/batch-courses", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const courses = await BatchService.getStudentBatchCourses(studentId);
    res.json({ success: true, courses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
