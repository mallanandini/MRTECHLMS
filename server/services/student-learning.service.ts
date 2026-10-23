/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../mysql.js";
import { usersDb, coursesDb, assessmentsDb, modulesDb, lessonsDb } from "../db.js";
import { AccessControlService } from "./access-control.service.js";

export class StudentLearningService {

  // =========================================================================
  // 1. STUDENT HOME / DASHBOARD 10-PILLAR AGGREGATION
  // =========================================================================

  public static async getStudentHomeData(studentId: string, orgId: string = "org-default") {
    // 1. All Effective Courses for Student (direct non-revoked + active batch)
    const effectiveCourses = await AccessControlService.getStudentEffectiveCourses(studentId);
    const effectiveCourseIds = effectiveCourses.map(c => c.courseId);
    const effectiveCourseMap = new Map(effectiveCourses.map(c => [c.courseId, c]));

    let assignedCourses: any[] = [];
    if (effectiveCourseIds.length > 0) {
      const ph = effectiveCourseIds.map(() => "?").join(",");
      const [enrollmentRows]: any = await pool.query(
        `SELECT 
          c.id AS courseId, c.title, c.description, c.category, c.thumbnail,
          c.instructorName, c.difficulty, c.estimatedDuration,
          e.id AS enrollmentId,
          COALESCE(e.progressPercentage, 0) AS progressPercentage,
          e.status, e.enrolledAt, e.dueDate, e.completedAt, e.isMandatory, e.lastAccessedAt,
          CASE WHEN e.dueDate IS NOT NULL AND e.dueDate < NOW() AND e.status != 'completed' AND COALESCE(e.progressPercentage, 0) < 100 THEN 1 ELSE 0 END AS isOverdue,
          CASE WHEN e.dueDate IS NOT NULL AND e.dueDate >= NOW() AND e.dueDate <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND e.status != 'completed' AND COALESCE(e.progressPercentage, 0) < 100 THEN 1 ELSE 0 END AS isDueSoon,
          CASE WHEN e.dueDate IS NOT NULL THEN DATEDIFF(e.dueDate, NOW()) ELSE NULL END AS daysRemaining
         FROM courses c
         LEFT JOIN enrollments e ON e.courseId = c.id AND e.studentId = ? AND e.deletedAt IS NULL
         WHERE c.id IN (${ph}) AND c.deletedAt IS NULL
         ORDER BY isOverdue DESC, isDueSoon DESC, COALESCE(e.lastAccessedAt, e.enrolledAt, c.createdAt) DESC`,
        [studentId, ...effectiveCourseIds]
      );

      // Fetch lesson counts for all enrolled courses
      let totalLessonsMap = new Map<string, number>();
      let completedLessonsMap = new Map<string, number>();

      const [totalRows]: any = await pool.query(
        `SELECT courseId, COUNT(id) AS cnt FROM lessons WHERE courseId IN (${ph}) AND deletedAt IS NULL GROUP BY courseId`,
        effectiveCourseIds
      );
      totalRows.forEach((r: any) => totalLessonsMap.set(r.courseId, Number(r.cnt) || 0));

      const [compRows]: any = await pool.query(
        `SELECT courseId, COUNT(id) AS cnt FROM progress WHERE studentId = ? AND courseId IN (${ph}) AND completed = 1 GROUP BY courseId`,
        [studentId, ...effectiveCourseIds]
      );
      compRows.forEach((r: any) => completedLessonsMap.set(r.courseId, Number(r.cnt) || 0));

      // Attach lessons count and assessment ID to assigned courses
      const [courseAssessments]: any = await pool.query(
        `SELECT id, courseId FROM assessments WHERE deletedAt IS NULL AND (lessonId IS NULL OR type = 'course_final')`
      );
      const courseAssMap = new Map<string, string>();
      courseAssessments.forEach((a: any) => {
        if (a.courseId) courseAssMap.set(a.courseId, a.id);
      });

      assignedCourses = enrollmentRows.map((e: any) => {
        const eff = effectiveCourseMap.get(e.courseId);
        const totalCount = totalLessonsMap.get(e.courseId) || 0;
        const completedCount = completedLessonsMap.get(e.courseId) || 0;
        const calculatedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : Number(e.progressPercentage) || 0;

        return {
          enrollmentId: e.enrollmentId || eff?.enrollmentId || `batch-${e.courseId}`,
          courseId: e.courseId,
          title: e.title,
          description: e.description,
          category: e.category,
          thumbnail: e.thumbnail,
          instructorName: e.instructorName || "Academy Faculty",
          difficulty: e.difficulty || "Beginner",
          estimatedDuration: e.estimatedDuration || "4 hours",
          progressPercentage: calculatedPct,
          completedCount,
          totalCount,
          status: calculatedPct >= 100 ? "completed" : (eff?.status || e.status || "assigned"),
          enrolledAt: e.enrolledAt || eff?.enrolledAt || new Date().toISOString(),
          dueDate: e.dueDate || null,
          completedAt: e.completedAt || null,
          isMandatory: !!e.isMandatory,
          isOverdue: !!e.isOverdue,
          isDueSoon: !!e.isDueSoon,
          daysRemaining: e.daysRemaining !== null ? Number(e.daysRemaining) : null,
          assessmentId: courseAssMap.get(e.courseId) || null,
          batchNames: eff?.batches?.map(b => b.name) || []
        };
      });
    }

    // 2. Continue Learning Selection
    let continueLearning: any = null;
    const inProgressCourses = assignedCourses.filter((c: any) => c.status !== "completed" && c.progressPercentage < 100);
    const targetCourse = inProgressCourses[0] || assignedCourses[0] || null;

    if (targetCourse) {
      // Find last accessed lesson or next incomplete lesson in this course
      const [lastLessonRows]: any = await pool.query(
        `SELECT l.id, l.title, l.type, l.durationMinutes, p.lastAccessedAt
         FROM progress p
         JOIN lessons l ON p.lessonId = l.id
         WHERE p.studentId = ? AND p.courseId = ? AND p.completed = 0 AND l.deletedAt IS NULL
         ORDER BY p.lastAccessedAt DESC
         LIMIT 1`,
        [studentId, targetCourse.courseId]
      );

      let targetLesson = lastLessonRows[0];
      if (!targetLesson) {
        // Fallback: first incomplete lesson
        const [nextIncompleteRows]: any = await pool.query(
          `SELECT l.id, l.title, l.type, l.durationMinutes
           FROM lessons l
           JOIN modules m ON l.moduleId = m.id
           LEFT JOIN progress p ON l.id = p.lessonId AND p.studentId = ?
           WHERE l.courseId = ? AND (p.completed IS NULL OR p.completed = 0) AND l.deletedAt IS NULL
           ORDER BY m.order ASC, l.order ASC
           LIMIT 1`,
          [studentId, targetCourse.courseId]
        );
        targetLesson = nextIncompleteRows[0];
      }

      if (!targetLesson) {
        // Fallback to first lesson
        const [firstLessonRows]: any = await pool.query(
          `SELECT l.id, l.title, l.type, l.durationMinutes
           FROM lessons l
           JOIN modules m ON l.moduleId = m.id
           WHERE l.courseId = ? AND l.deletedAt IS NULL
           ORDER BY m.order ASC, l.order ASC
           LIMIT 1`,
          [targetCourse.courseId]
        );
        targetLesson = firstLessonRows[0];
      }

      continueLearning = {
        courseId: targetCourse.courseId,
        courseTitle: targetCourse.title,
        courseThumbnail: targetCourse.thumbnail,
        category: targetCourse.category,
        progressPercentage: targetCourse.progressPercentage,
        completedCount: targetCourse.completedCount,
        totalCount: targetCourse.totalCount,
        lessonId: targetLesson?.id || null,
        lessonTitle: targetLesson?.title || "Start First Lesson",
        lessonType: targetLesson?.type || "video",
        durationMinutes: Number(targetLesson?.durationMinutes) || 15
      };
    }

    // 3. Learning Paths (using AccessControlService for unified effective access)
    const effectiveLps = await AccessControlService.getStudentEffectiveLearningPaths(studentId);
    const activeAssignedLps = effectiveLps.filter(lp => lp.effectiveStatus === "active" && !lp.isDenied);

    // Calculate LP progress %
    const [lpItems]: any = await pool.query(
      `SELECT learningPathId, COUNT(id) AS cnt FROM learning_path_items GROUP BY learningPathId`
    );
    const lpTotalMap = new Map<string, number>(lpItems.map((r: any) => [r.learningPathId, Number(r.cnt) || 0]));

    const [lpProg]: any = await pool.query(
      `SELECT learningPathId, COUNT(id) AS cnt FROM learning_path_progress WHERE studentId = ? AND completed = 1 GROUP BY learningPathId`,
      [studentId]
    );
    const lpCompMap = new Map<string, number>(lpProg.map((r: any) => [r.learningPathId, Number(r.cnt) || 0]));

    const learningPaths = activeAssignedLps.map((p) => {
      const total = Number(lpTotalMap.get(p.learningPathId)) || 0;
      const comp = Number(lpCompMap.get(p.learningPathId)) || 0;
      const pct = total > 0 ? Math.round((comp / total) * 100) : 0;

      let isOverdue = false;
      let isDueSoon = false;
      let daysRemaining: number | null = null;
      if (p.dueDate) {
        const dueTime = new Date(p.dueDate).getTime();
        const nowTime = Date.now();
        const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;
        if (dueTime < nowTime && p.status !== "completed") {
          isOverdue = true;
        } else if (diffDays >= 0 && diffDays <= 7 && p.status !== "completed") {
          isDueSoon = true;
        }
      }

      return {
        assignmentId: p.learningPathId,
        pathId: p.learningPathId,
        title: p.learningPathTitle,
        description: p.description || "",
        thumbnail: p.thumbnail,
        category: p.category || "Technology",
        estimatedDuration: p.estimatedDuration || "Flexible",
        status: p.status,
        pathStatus: p.pathStatus || "published",
        isUnpublished: p.pathStatus ? p.pathStatus !== "published" : false,
        isIncomplete: total === 0,
        dueDate: p.dueDate,
        assignedAt: p.assignedAt,
        assignmentSource: p.assignmentSource,
        sourceDetails: p.sourceDetails,
        isOverdue,
        isDueSoon,
        daysRemaining,
        progressPercentage: pct,
        completedItemsCount: comp,
        totalItemsCount: total
      };
    });

    // 4. Upcoming & Direct Assigned Assessments
    const [directAssRows]: any = await pool.query(
      `SELECT 
        aa.id AS assignmentId, a.id AS assessmentId, a.title, a.courseId, c.title AS courseTitle,
        a.passingScore, a.totalPoints, a.durationMinutes, a.type,
        aa.dueDate, aa.status,
        CASE WHEN aa.dueDate IS NOT NULL AND aa.dueDate < NOW() AND aa.status != 'completed' THEN 1 ELSE 0 END AS isOverdue,
        CASE WHEN aa.dueDate IS NOT NULL AND aa.dueDate >= NOW() AND aa.dueDate <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND aa.status != 'completed' THEN 1 ELSE 0 END AS isDueSoon,
        CASE WHEN aa.dueDate IS NOT NULL THEN DATEDIFF(aa.dueDate, NOW()) ELSE null END AS daysRemaining
       FROM assessment_assignments aa
       JOIN assessments a ON aa.assessmentId = a.id
       LEFT JOIN courses c ON a.courseId = c.id
       WHERE aa.studentId = ? AND aa.deletedAt IS NULL
       ORDER BY isOverdue DESC, isDueSoon DESC, aa.assignedAt DESC`,
      [studentId]
    );

    // Fetch submissions for assessments to know status and attempts
    const [subRows]: any = await pool.query(
      `SELECT assessmentId, score, totalPoints, percentage, passed, submittedAt, attemptNumber
       FROM submissions
       WHERE studentId = ?
       ORDER BY submittedAt DESC`,
      [studentId]
    );
    const subMap = new Map<string, any[]>();
    subRows.forEach((s: any) => {
      const existing = subMap.get(s.assessmentId) || [];
      existing.push(s);
      subMap.set(s.assessmentId, existing);
    });

    const upcomingAssessments = directAssRows.map((a: any) => {
      const subs = subMap.get(a.assessmentId) || [];
      const latestSub = subs[0];
      const hasPassed = subs.some((s: any) => s.passed);

      return {
        assignmentId: a.assignmentId,
        assessmentId: a.assessmentId,
        title: a.title,
        courseId: a.courseId,
        courseTitle: a.courseTitle || "Independent Exam",
        passingScore: a.passingScore,
        totalPoints: a.totalPoints,
        durationMinutes: a.durationMinutes,
        dueDate: a.dueDate,
        isOverdue: !!a.isOverdue,
        isDueSoon: !!a.isDueSoon,
        daysRemaining: a.daysRemaining !== null ? Number(a.daysRemaining) : null,
        status: hasPassed ? "passed" : latestSub ? "failed" : a.status || "pending",
        attemptsCount: subs.length,
        latestScore: latestSub ? latestSub.percentage : null
      };
    });

    // 5. Due Soon & Overdue Aggregations
    const dueSoonItems = [
      ...assignedCourses.filter((c: any) => c.isDueSoon).map((c: any) => ({
        type: "course",
        id: c.courseId,
        title: c.title,
        dueDate: c.dueDate,
        daysRemaining: c.daysRemaining,
        progressPercentage: c.progressPercentage
      })),
      ...learningPaths.filter((p: any) => p.isDueSoon).map((p: any) => ({
        type: "learning_path",
        id: p.pathId,
        title: p.title,
        dueDate: p.dueDate,
        daysRemaining: Number(p.daysRemaining),
        progressPercentage: Number(p.progressPercentage)
      })),
      ...upcomingAssessments.filter((a: any) => a.isDueSoon && a.status !== "passed").map((a: any) => ({
        type: "assessment",
        id: a.assessmentId,
        title: a.title,
        dueDate: a.dueDate,
        daysRemaining: a.daysRemaining,
        status: a.status
      }))
    ];

    const overdueItems = [
      ...assignedCourses.filter((c: any) => c.isOverdue).map((c: any) => ({
        type: "course",
        id: c.courseId,
        title: c.title,
        dueDate: c.dueDate,
        daysOverdue: Math.abs(c.daysRemaining || 1),
        progressPercentage: c.progressPercentage
      })),
      ...learningPaths.filter((p: any) => p.isOverdue).map((p: any) => ({
        type: "learning_path",
        id: p.pathId,
        title: p.title,
        dueDate: p.dueDate,
        daysOverdue: Math.abs(Number(p.daysRemaining) || 1),
        progressPercentage: Number(p.progressPercentage)
      })),
      ...upcomingAssessments.filter((a: any) => a.isOverdue && a.status !== "passed").map((a: any) => ({
        type: "assessment",
        id: a.assessmentId,
        title: a.title,
        dueDate: a.dueDate,
        daysOverdue: Math.abs(a.daysRemaining || 1),
        status: a.status
      }))
    ];

    // 6. Recent Activity Chronological Feed
    const [recentLessons]: any = await pool.query(
      `SELECT p.completedAt, l.title AS lessonTitle, c.title AS courseTitle
       FROM progress p
       JOIN lessons l ON p.lessonId = l.id
       JOIN courses c ON p.courseId = c.id
       WHERE p.studentId = ? AND p.completed = 1 AND p.completedAt IS NOT NULL
       ORDER BY p.completedAt DESC
       LIMIT 8`,
      [studentId]
    );

    const [recentCerts]: any = await pool.query(
      `SELECT title, certificateNumber, issuedAt
       FROM certificates
       WHERE studentId = ? AND status = 'active' AND deletedAt IS NULL
       ORDER BY issuedAt DESC
       LIMIT 4`,
      [studentId]
    );

    const [recentCoding]: any = await pool.query(
      `SELECT cs.submittedAt, cs.status, cs.language, cs.passedCount, cs.totalCount, cc.title AS challengeTitle
       FROM coding_submissions cs
       LEFT JOIN coding_challenges cc ON cs.problemId = cc.id
       WHERE cs.studentId = ?
       ORDER BY cs.submittedAt DESC
       LIMIT 6`,
      [studentId]
    );

    const recentActivity = [
      ...recentLessons.map((l: any) => ({
        type: "lesson",
        title: `Completed lesson "${l.lessonTitle}"`,
        detail: l.courseTitle,
        date: l.completedAt,
        status: "success"
      })),
      ...subRows.slice(0, 6).map((s: any) => ({
        type: "assessment",
        title: `${s.passed ? "Passed" : "Attempted"} Assessment`,
        detail: `Score: ${s.percentage}% (${s.score}/${s.totalPoints} pts) • Attempt #${s.attemptNumber || 1}`,
        date: s.submittedAt,
        status: s.passed ? "success" : "failed"
      })),
      ...recentCerts.map((c: any) => ({
        type: "certificate",
        title: `Earned Certificate: ${c.title}`,
        detail: `Credential #${c.certificateNumber}`,
        date: c.issuedAt,
        status: "success"
      })),
      ...recentCoding.map((c: any) => ({
        type: "coding",
        title: `Coding: ${c.challengeTitle || "Algorithm Challenge"}`,
        detail: `${c.language?.toUpperCase()} • ${c.passedCount}/${c.totalCount} tests passed`,
        date: c.submittedAt,
        status: c.status === "passed" ? "success" : "failed"
      })),
      ...assignedCourses.slice(0, 4).map((e: any) => ({
        type: "enrollment",
        title: `Enrolled in "${e.title}"`,
        detail: e.category,
        date: e.enrolledAt,
        status: "info"
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    // 7. Certificates
    const [certificates]: any = await pool.query(
      `SELECT id, certificateNumber, verificationCode, title, type, scorePercentage, issuedAt, expiresAt, status
       FROM certificates
       WHERE studentId = ? AND status = 'active' AND deletedAt IS NULL
       ORDER BY issuedAt DESC`,
      [studentId]
    );

    // 8. Global Progress Metrics & Streak
    const totalAssignedCourses = assignedCourses.length;
    const completedCourses = assignedCourses.filter((c: any) => c.status === "completed" || c.progressPercentage >= 100).length;
    const inProgressCount = assignedCourses.filter((c: any) => c.status !== "completed" && c.progressPercentage > 0 && c.progressPercentage < 100).length;
    const overallCompletionRate = totalAssignedCourses > 0 
      ? Math.round((completedCourses / totalAssignedCourses) * 1000) / 10 
      : 0;

    const totalSubmissions = subRows.length;
    const passedAssessments = subRows.filter((s: any) => s.passed).length;
    const avgScore = totalSubmissions > 0
      ? Math.round((subRows.reduce((acc: number, s: any) => acc + Number(s.percentage), 0) / totalSubmissions) * 10) / 10
      : 0;

    const codingChallengesSolved = recentCoding.filter((c: any) => c.status === "passed").length;

    // Total completed lessons
    const [totalCompletedLessonsRow]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM progress WHERE studentId = ? AND completed = 1`,
      [studentId]
    );
    const totalLessonsCompleted = Number(totalCompletedLessonsRow[0]?.cnt) || 0;

    // Estimate learning hours from lessons
    const estimatedLearningHours = Math.round((totalLessonsCompleted * 20) / 60);

    // Consecutive learning streak days
    const [streakDaysRow]: any = await pool.query(
      `SELECT COUNT(DISTINCT DATE(completedAt)) AS cnt 
       FROM progress 
       WHERE studentId = ? AND completedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [studentId]
    );
    const learningStreakDays = Math.max(1, Number(streakDaysRow[0]?.cnt) || 1);

    const progress = {
      totalAssignedCourses,
      completedCourses,
      inProgressCourses: inProgressCount,
      overallCompletionRate,
      passedAssessments,
      totalAssessmentsAttempted: totalSubmissions,
      averageAssessmentScore: avgScore,
      totalCertificates: certificates.length,
      codingChallengesSolved,
      totalLessonsCompleted,
      learningStreakDays,
      estimatedLearningHours
    };

    // 9. Recommended Learning Catalog (Courses not yet enrolled)
    const [recRows]: any = await pool.query(
      `SELECT 
        c.id, c.title, c.category, c.thumbnail, c.shortDescription, c.description,
        c.difficulty, c.estimatedDuration, c.rating, c.reviewsCount,
        c.prerequisites, c.skillsCovered
       FROM courses c
       WHERE c.organizationId = ? AND c.status = 'published' AND c.deletedAt IS NULL
         AND c.id NOT IN (
           SELECT courseId FROM enrollments WHERE studentId = ? AND status != 'revoked' AND deletedAt IS NULL
           UNION
           SELECT bc.courseId FROM batch_students bs JOIN batch_courses bc ON bc.batchId = bs.batchId WHERE bs.studentId = ? AND bs.status = 'active' AND bc.status = 'active'
           UNION
           SELECT b.courseId FROM batch_students bs JOIN batches b ON b.id = bs.batchId WHERE bs.studentId = ? AND bs.status = 'active' AND b.courseId IS NOT NULL AND b.courseId != ''
         )
       ORDER BY c.rating DESC, c.reviewsCount DESC
       LIMIT 4`,
      [orgId, studentId, studentId, studentId]
    );

    const recommendedLearning = recRows.map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      thumbnail: r.thumbnail,
      shortDescription: r.shortDescription || (r.description ? r.description.slice(0, 120) + "..." : ""),
      difficulty: r.difficulty || "Intermediate",
      estimatedDuration: r.estimatedDuration || "6 hours",
      rating: Number(r.rating) || 5.0,
      reviewsCount: Number(r.reviewsCount) || 0,
      prerequisites: typeof r.prerequisites === "string" ? JSON.parse(r.prerequisites) : r.prerequisites || [],
      skillsCovered: typeof r.skillsCovered === "string" ? JSON.parse(r.skillsCovered) : r.skillsCovered || []
    }));

    // 10. Student Active Batches with courses
    const [myBatches]: any = await pool.query(`
      SELECT 
        b.id, b.name, b.code, b.academicYear, b.startDate, b.endDate, b.status,
        i.name AS institutionName, i.code AS institutionCode
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      JOIN institutions i ON b.institutionId = i.id
      WHERE bs.studentId = ? AND bs.status = 'active' AND b.status = 'active' AND b.deletedAt IS NULL
      ORDER BY bs.enrolledAt DESC
    `, [studentId]);

    for (const b of myBatches) {
      const [batchCourses]: any = await pool.query(`
        SELECT c.id, c.title, c.thumbnail, c.category, c.difficulty AS level
        FROM batch_courses bc
        JOIN courses c ON bc.courseId = c.id
        WHERE bc.batchId = ? AND bc.status = 'active' AND c.deletedAt IS NULL
        ORDER BY c.title ASC
      `, [b.id]);
      b.courses = batchCourses;
    }

    return {
      // 10 Pillars:
      continueLearning,
      assignedCourses,
      learningPaths: learningPaths,
      upcomingAssessments,
      dueSoon: dueSoonItems,
      overdue: overdueItems,
      recentActivity,
      certificates,
      progress,
      recommendedLearning,
      batches: myBatches || [],

      // Backwards-compatibility fields for existing components:
      enrolledCount: totalAssignedCourses,
      completedCourses,
      averageProgress: Math.round(overallCompletionRate),
      passedAssessments,
      codingChallengesSolved,
      courseProgress: assignedCourses.map((c: any) => ({
        courseId: c.courseId,
        title: c.title,
        thumbnail: c.thumbnail,
        percentage: c.progressPercentage,
        completedCount: c.completedCount,
        totalCount: c.totalCount,
        assessmentId: c.assessmentId
      }))
    };
  }

  // =========================================================================
  // 2. DETAILED COURSE EXPERIENCE & OVERVIEW SYLLABUS
  // =========================================================================

  public static async getCourseOverview(courseId: string, studentId: string) {
    const course = await coursesDb.findOne({ id: courseId });
    if (!course) throw new Error("Course not found");

    // Fetch modules and lessons
    const [modules]: any = await pool.query(
      `SELECT id, courseId, title, \`order\`, description 
       FROM modules 
       WHERE courseId = ? AND status = 'published' AND deletedAt IS NULL
       ORDER BY \`order\` ASC`,
      [courseId]
    );

    const [lessons]: any = await pool.query(
      `SELECT id, moduleId, courseId, title, type, durationMinutes, \`order\`, description, assessmentId
       FROM lessons 
       WHERE courseId = ? AND status = 'published' AND deletedAt IS NULL
       ORDER BY \`order\` ASC`,
      [courseId]
    );

    // Fetch student progress if enrolled
    const [enrRows]: any = await pool.query(
      `SELECT id, status, progressPercentage, enrolledAt, dueDate, completedAt, isMandatory
       FROM enrollments
       WHERE studentId = ? AND courseId = ? AND deletedAt IS NULL`,
      [studentId, courseId]
    );
    const enrollment = enrRows[0] || null;

    let completedLessonIds: string[] = [];
    if (enrollment) {
      const [progRows]: any = await pool.query(
        `SELECT lessonId FROM progress WHERE studentId = ? AND courseId = ? AND completed = 1`,
        [studentId, courseId]
      );
      completedLessonIds = progRows.map((p: any) => p.lessonId);
    }

    // Attach lessons to modules
    const modulesWithLessons = modules.map((m: any) => {
      const modLessons = lessons.filter((l: any) => l.moduleId === m.id);
      const modCompleted = modLessons.filter((l: any) => completedLessonIds.includes(l.id)).length;
      return {
        ...m,
        lessons: modLessons,
        completedCount: modCompleted,
        totalLessons: modLessons.length
      };
    });

    // Final assessment info
    const [assRows]: any = await pool.query(
      `SELECT id, title, description, durationMinutes, passingScore, totalPoints, questionsCount, type
       FROM assessments
       WHERE courseId = ? AND (lessonId IS NULL OR type = 'course_final') AND deletedAt IS NULL
       LIMIT 1`,
      [courseId]
    );
    const finalAssessment = assRows[0] || null;

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        shortDescription: (course as any).shortDescription || "",
        thumbnail: course.thumbnail,
        category: course.category,
        difficulty: (course as any).difficulty || "Beginner",
        estimatedDuration: (course as any).estimatedDuration || "6 hours",
        instructorName: course.instructorName || "Academy Faculty",
        prerequisites: typeof (course as any).prerequisites === "string" ? JSON.parse((course as any).prerequisites) : (course as any).prerequisites || [],
        skillsCovered: typeof (course as any).skillsCovered === "string" ? JSON.parse((course as any).skillsCovered) : (course as any).skillsCovered || [],
        requirements: typeof (course as any).requirements === "string" ? JSON.parse((course as any).requirements) : (course as any).requirements || [],
        certificateEnabled: !!(course as any).certificateEnabled,
        rating: Number((course as any).rating) || 5.0,
        reviewsCount: Number((course as any).reviewsCount) || 0
      },
      enrollment: enrollment ? {
        status: enrollment.status,
        progressPercentage: Number(enrollment.progressPercentage) || 0,
        enrolledAt: enrollment.enrolledAt,
        dueDate: enrollment.dueDate,
        completedAt: enrollment.completedAt,
        isMandatory: !!enrollment.isMandatory
      } : null,
      modules: modulesWithLessons,
      totalLessons: lessons.length,
      completedLessonsCount: completedLessonIds.length,
      finalAssessment
    };
  }

  // =========================================================================
  // 3. STUDENT PROFILE & ACHIEVEMENTS DATA
  // =========================================================================

  public static async getStudentProfileData(studentId: string, orgId: string = "org-default") {
    const user = await usersDb.findOne({ id: studentId });
    if (!user) throw new Error("Student not found");

    // Fetch departmental & organization affiliations
    let departmentName = "General Division";
    if (user.departmentId) {
      const [deptRows]: any = await pool.query(`SELECT name, code FROM departments WHERE id = ?`, [user.departmentId]);
      if (deptRows[0]) departmentName = deptRows[0].name;
    }

    // Learning statistics
    const homeData = await this.getStudentHomeData(studentId, orgId);

    // Compute dynamic achievements / badges
    const achievements: Array<{ id: string; title: string; description: string; icon: string; earned: boolean; earnedAt?: string }> = [
      {
        id: "first_step",
        title: "First Step",
        description: "Completed your first lesson in any course",
        icon: "Footprints",
        earned: homeData.progress.totalLessonsCompleted >= 1
      },
      {
        id: "course_champion",
        title: "Course Champion",
        description: "Successfully graduated from an entire course",
        icon: "Trophy",
        earned: homeData.progress.completedCourses >= 1
      },
      {
        id: "curriculum_master",
        title: "Curriculum Master",
        description: "Completed 3 or more accredited learning courses",
        icon: "Crown",
        earned: homeData.progress.completedCourses >= 3
      },
      {
        id: "quiz_ace",
        title: "Quiz Ace",
        description: "Scored 85% or higher on an assessment exam",
        icon: "Award",
        earned: homeData.progress.averageAssessmentScore >= 85 && homeData.progress.passedAssessments >= 1
      },
      {
        id: "code_warrior",
        title: "Code Warrior",
        description: "Successfully submitted and passed interactive coding challenges",
        icon: "Code",
        earned: homeData.progress.codingChallengesSolved >= 1
      },
      {
        id: "certified_pro",
        title: "Certified Professional",
        description: "Earned an official tamper-evident credential certificate",
        icon: "Medal",
        earned: homeData.certificates.length >= 1
      },
      {
        id: "momentum_streak",
        title: "Active Momentum",
        description: "Maintained a continuous daily learning streak",
        icon: "Flame",
        earned: homeData.progress.learningStreakDays >= 3
      }
    ];

    // Collect skills covered across completed courses and user profile
    const skillsSet = new Set<string>();
    const userAny = user as any;
    if (userAny.skills && Array.isArray(userAny.skills)) {
      userAny.skills.forEach((s: string) => skillsSet.add(s));
    }
    homeData.assignedCourses
      .filter((c: any) => c.status === "completed")
      .forEach((c: any) => {
        if (c.category) skillsSet.add(c.category);
      });

    return {
      personalInfo: {
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: (user as any).jobTitle || "Student / Software Engineer",
        departmentName,
        profilePhoto: user.profilePhoto || null,
        bio: userAny.bio || "Student at MR Technologies Learning Academy",
        joinedDate: user.createdAt
      },
      statistics: homeData.progress,
      certificates: homeData.certificates,
      achievements,
      skills: Array.from(skillsSet),
      recentActivity: homeData.recentActivity
    };
  }
}
