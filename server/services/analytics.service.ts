/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../mysql.js";
import * as XLSX from "xlsx";
import { OrganizationService } from "./organization.service.js";
import { usersDb, coursesDb, assessmentsDb, questionsDb } from "../db.js";

export interface AnalyticsFilterOptions {
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedOptions extends AnalyticsFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export class AnalyticsService {

  // =========================================================================
  // 1. ADMIN OVERVIEW ANALYTICS & ACTIVITY TRENDS
  // =========================================================================

  public static async getAdminOverviewAnalytics(options: AnalyticsFilterOptions = {}) {
    const orgId = options.organizationId || "org-default";
    const startDate = options.startDate || "1970-01-01";
    const endDate = options.endDate || "2099-12-31 23:59:59";

    // 1. Total Learners
    const [learnersRes]: any = await pool.query(
      `SELECT COUNT(id) AS totalLearners 
       FROM users 
       WHERE role = 'student' AND organizationId = ? AND deletedAt IS NULL`,
      [orgId]
    );
    const totalLearners = Number(learnersRes[0]?.totalLearners) || 0;

    // 2. Active Learners in designated date window
    const [activeRes]: any = await pool.query(
      `SELECT COUNT(DISTINCT studentId) AS activeLearners FROM (
        SELECT studentId FROM progress 
        WHERE (completedAt BETWEEN ? AND ? OR lastAccessedAt BETWEEN ? AND ?)
        UNION
        SELECT studentId FROM submissions 
        WHERE organizationId = ? AND submittedAt BETWEEN ? AND ?
        UNION
        SELECT studentId FROM enrollments 
        WHERE organizationId = ? AND (lastAccessedAt BETWEEN ? AND ? OR completedAt BETWEEN ? AND ?)
      ) AS active_pool`,
      [startDate, endDate, startDate, endDate, orgId, startDate, endDate, orgId, startDate, endDate, startDate, endDate]
    );
    const activeLearners = Number(activeRes[0]?.activeLearners) || 0;

    // 3. Courses catalog breakdown
    const [courseStats]: any = await pool.query(
      `SELECT 
        COUNT(id) AS total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
       FROM courses 
       WHERE organizationId = ? AND deletedAt IS NULL`,
      [orgId]
    );

    // 4. Enrollments & Course Completion Rate
    const [enrStats]: any = await pool.query(
      `SELECT 
        COUNT(id) AS total,
        SUM(CASE WHEN status = 'completed' OR progressPercentage >= 100 OR completedAt IS NOT NULL THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'in_progress' OR (progressPercentage > 0 AND progressPercentage < 100) THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'assigned' AND (progressPercentage IS NULL OR progressPercentage = 0) THEN 1 ELSE 0 END) AS notStarted
       FROM enrollments 
       WHERE organizationId = ? AND deletedAt IS NULL AND status != 'revoked'`,
      [orgId]
    );
    const totalEnrollments = Number(enrStats[0]?.total) || 0;
    const completedEnrollments = Number(enrStats[0]?.completed) || 0;
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 1000) / 10 : 0;

    // 5. Assessment Pass Rate & Average Score
    const [subStats]: any = await pool.query(
      `SELECT 
        COUNT(id) AS totalAttempts,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS passedCount,
        ROUND(AVG(percentage), 1) AS averageScore
       FROM submissions 
       WHERE organizationId = ?`,
      [orgId]
    );
    const totalAttempts = Number(subStats[0]?.totalAttempts) || 0;
    const passedCount = Number(subStats[0]?.passedCount) || 0;
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 1000) / 10 : 0;
    const failRate = totalAttempts > 0 ? Math.round((100 - passRate) * 10) / 10 : 0;
    const averageScore = Number(subStats[0]?.averageScore) || 0;

    // 6. Overdue Training Items
    const [overdueEnr]: any = await pool.query(
      `SELECT COUNT(id) AS count FROM enrollments 
       WHERE organizationId = ? 
         AND dueDate IS NOT NULL AND dueDate < NOW() 
         AND status NOT IN ('completed', 'revoked') 
         AND (progressPercentage IS NULL OR progressPercentage < 100)
         AND deletedAt IS NULL`,
      [orgId]
    );
    const [overdueAss]: any = await pool.query(
      `SELECT COUNT(id) AS count FROM assessment_assignments 
       WHERE organizationId = ? 
         AND dueDate IS NOT NULL AND dueDate < NOW() 
         AND status NOT IN ('completed', 'revoked') 
         AND deletedAt IS NULL`,
      [orgId]
    );
    const overdueCount = (Number(overdueEnr[0]?.count) || 0) + (Number(overdueAss[0]?.count) || 0);

    // 7. Certificates Issued
    const [certRes]: any = await pool.query(
      `SELECT COUNT(id) AS count FROM certificates 
       WHERE organizationId = ? AND status = 'active' AND deletedAt IS NULL`,
      [orgId]
    );
    const certificatesIssued = Number(certRes[0]?.count) || 0;

    // 8. Learning Activity Time Series (Last 14 days or filtered window)
    const [activityRows]: any = await pool.query(
      `SELECT 
        DATE(activity_date) AS date,
        SUM(enrollment_count) AS enrollments,
        SUM(completion_count) AS completions,
        SUM(submission_count) AS submissions
       FROM (
         SELECT enrolledAt AS activity_date, 1 AS enrollment_count, 0 AS completion_count, 0 AS submission_count 
         FROM enrollments WHERE organizationId = ? AND enrolledAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         UNION ALL
         SELECT completedAt AS activity_date, 0 AS enrollment_count, 1 AS completion_count, 0 AS submission_count 
         FROM enrollments WHERE organizationId = ? AND completedAt IS NOT NULL AND completedAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         UNION ALL
         SELECT submittedAt AS activity_date, 0 AS enrollment_count, 0 AS completion_count, 1 AS submission_count 
         FROM submissions WHERE organizationId = ? AND submittedAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       ) AS combined_activity
       GROUP BY DATE(activity_date)
       ORDER BY date ASC`,
      [orgId, orgId, orgId]
    );

    const activityTrend = activityRows.map((r: any) => ({
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
      enrollments: Number(r.enrollments) || 0,
      completions: Number(r.completions) || 0,
      submissions: Number(r.submissions) || 0
    }));

    return {
      totalLearners,
      activeLearners,
      courses: {
        total: Number(courseStats[0]?.total) || 0,
        published: Number(courseStats[0]?.published) || 0,
        draft: Number(courseStats[0]?.draft) || 0,
        archived: Number(courseStats[0]?.archived) || 0
      },
      enrollments: {
        total: totalEnrollments,
        inProgress: Number(enrStats[0]?.inProgress) || 0,
        completed: completedEnrollments,
        notStarted: Number(enrStats[0]?.notStarted) || 0
      },
      completionRate,
      assessmentStats: {
        totalAttempts,
        passedCount,
        passRate,
        failRate,
        averageScore
      },
      overdueCount,
      certificatesIssued,
      activityTrend
    };
  }

  // =========================================================================
  // 2. COURSE-LEVEL ANALYTICS & DROP-OFF ANALYSIS
  // =========================================================================

  public static async getCoursesAnalyticsList(options: PaginatedOptions = {}) {
    const orgId = options.organizationId || "org-default";
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.id, c.title, c.category, c.status, c.thumbnail,
        COUNT(e.id) AS totalEnrollments,
        SUM(CASE WHEN e.progressPercentage > 0 OR e.status = 'in_progress' OR e.status = 'completed' THEN 1 ELSE 0 END) AS startsCount,
        SUM(CASE WHEN e.status = 'completed' OR e.progressPercentage >= 100 OR e.completedAt IS NOT NULL THEN 1 ELSE 0 END) AS completionsCount,
        ROUND(AVG(e.progressPercentage), 1) AS avgProgressPercentage
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.courseId AND e.deletedAt IS NULL
      WHERE c.organizationId = ? AND c.deletedAt IS NULL
    `;
    const params: any[] = [orgId];

    if (options.search) {
      query += ` AND c.title LIKE ?`;
      params.push(`%${options.search}%`);
    }

    if (options.status && options.status !== "all") {
      query += ` AND c.status = ?`;
      params.push(options.status);
    }

    query += ` GROUP BY c.id ORDER BY totalEnrollments DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);

    let countQuery = `SELECT COUNT(id) AS cnt FROM courses WHERE organizationId = ? AND deletedAt IS NULL`;
    const countParams: any[] = [orgId];
    if (options.search) {
      countQuery += ` AND title LIKE ?`;
      countParams.push(`%${options.search}%`);
    }
    if (options.status && options.status !== "all") {
      countQuery += ` AND status = ?`;
      countParams.push(options.status);
    }
    const [cntRows]: any = await pool.query(countQuery, countParams);
    const total = Number(cntRows[0]?.cnt) || 0;

    const items = rows.map((r: any) => {
      const totalEnr = Number(r.totalEnrollments) || 0;
      const comps = Number(r.completionsCount) || 0;
      const completionRate = totalEnr > 0 ? Math.round((comps / totalEnr) * 1000) / 10 : 0;
      return {
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        thumbnail: r.thumbnail,
        totalEnrollments: totalEnr,
        startsCount: Number(r.startsCount) || 0,
        completionsCount: comps,
        completionRate,
        avgProgressPercentage: Number(r.avgProgressPercentage) || 0
      };
    });

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  public static async getCourseAnalytics(courseId: string, options: PaginatedOptions = {}) {
    const orgId = options.organizationId || "org-default";
    const course = await coursesDb.findOne({ id: courseId });
    if (!course) throw new Error("Course not found");

    // 1. Enrollment and Completion Metrics
    const [enrRows]: any = await pool.query(
      `SELECT 
        COUNT(e.id) AS totalEnrollments,
        SUM(CASE WHEN e.progressPercentage > 0 OR e.status = 'in_progress' OR e.status = 'completed' THEN 1 ELSE 0 END) AS startsCount,
        SUM(CASE WHEN e.status = 'completed' OR e.progressPercentage >= 100 OR e.completedAt IS NOT NULL THEN 1 ELSE 0 END) AS completionsCount,
        ROUND(AVG(e.progressPercentage), 1) AS avgProgressPercentage,
        ROUND(AVG(CASE WHEN e.completedAt IS NOT NULL THEN TIMESTAMPDIFF(DAY, e.enrolledAt, e.completedAt) ELSE NULL END), 1) AS avgCompletionDays
       FROM enrollments e
       WHERE e.courseId = ? AND e.deletedAt IS NULL AND e.status != 'revoked'`,
      [courseId]
    );

    const totalEnrollments = Number(enrRows[0]?.totalEnrollments) || 0;
    const startsCount = Number(enrRows[0]?.startsCount) || 0;
    const completionsCount = Number(enrRows[0]?.completionsCount) || 0;
    const completionPercentage = totalEnrollments > 0 ? Math.round((completionsCount / totalEnrollments) * 1000) / 10 : 0;
    const avgCompletionDays = Number(enrRows[0]?.avgCompletionDays) || 0;
    const avgProgressPercentage = Number(enrRows[0]?.avgProgressPercentage) || 0;

    // 2. Drop-off Points & Lesson Bottleneck Analysis
    // Fetch all published lessons ordered
    const [lessons]: any = await pool.query(
      `SELECT 
        l.id, l.title, l.moduleId, l.order,
        m.title AS moduleTitle, m.order AS moduleOrder,
        COUNT(p.id) AS completedCount
       FROM lessons l
       JOIN modules m ON l.moduleId = m.id
       LEFT JOIN progress p ON l.id = p.lessonId AND p.completed = 1
       WHERE l.courseId = ? AND l.deletedAt IS NULL
       GROUP BY l.id, m.id
       ORDER BY m.order ASC, l.order ASC`,
      [courseId]
    );

    let prevCount = totalEnrollments;
    const dropOffPoints = lessons.map((l: any) => {
      const completedStudents = Number(l.completedCount) || 0;
      const completionRate = totalEnrollments > 0 ? Math.round((completedStudents / totalEnrollments) * 1000) / 10 : 0;
      const dropOff = Math.max(0, prevCount - completedStudents);
      prevCount = completedStudents;

      return {
        lessonId: l.id,
        lessonTitle: l.title,
        moduleId: l.moduleId,
        moduleTitle: l.moduleTitle,
        completedStudents,
        completionRate,
        dropOff
      };
    });

    // 3. Final / Linked Assessment Scorecard
    const [assessments]: any = await pool.query(
      `SELECT 
        a.id, a.title, a.passingScore,
        COUNT(s.id) AS totalAttempts,
        SUM(CASE WHEN s.passed = 1 THEN 1 ELSE 0 END) AS passedCount,
        ROUND(AVG(s.percentage), 1) AS avgScore
       FROM assessments a
       LEFT JOIN submissions s ON a.id = s.assessmentId
       WHERE a.courseId = ? AND a.deletedAt IS NULL
       GROUP BY a.id`,
      [courseId]
    );

    // 4. Paginated Enrolled Learners List
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    let learnerQuery = `
      SELECT 
        e.id AS enrollmentId,
        e.studentId,
        u.name AS studentName,
        u.email AS studentEmail,
        u.jobTitle,
        d.name AS departmentName,
        e.status,
        COALESCE(e.progressPercentage, 0) AS progressPercent,
        e.enrolledAt,
        e.dueDate,
        e.completedAt,
        e.isMandatory
      FROM enrollments e
      JOIN users u ON e.studentId = u.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE e.courseId = ? AND e.deletedAt IS NULL
    `;
    const params: any[] = [courseId];

    if (options.search) {
      learnerQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    if (options.status && options.status !== "all") {
      learnerQuery += ` AND e.status = ?`;
      params.push(options.status);
    }

    learnerQuery += ` ORDER BY e.progressPercentage DESC, e.enrolledAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [learnerRows]: any = await pool.query(learnerQuery, params);

    // Count query
    const [totalRows]: any = await pool.query(
      `SELECT COUNT(e.id) AS cnt 
       FROM enrollments e 
       JOIN users u ON e.studentId = u.id 
       WHERE e.courseId = ? AND e.deletedAt IS NULL`,
      [courseId]
    );

    return {
      course: {
        id: course.id,
        title: course.title,
        category: course.category,
        status: course.status,
        thumbnail: course.thumbnail
      },
      metrics: {
        totalEnrollments,
        startsCount,
        completionsCount,
        completionPercentage,
        avgCompletionDays,
        avgProgressPercentage
      },
      dropOffPoints,
      assessments: assessments.map((a: any) => ({
        id: a.id,
        title: a.title,
        passingScore: a.passingScore,
        totalAttempts: Number(a.totalAttempts) || 0,
        passedCount: Number(a.passedCount) || 0,
        passRate: a.totalAttempts > 0 ? Math.round((Number(a.passedCount) / Number(a.totalAttempts)) * 1000) / 10 : 0,
        avgScore: Number(a.avgScore) || 0
      })),
      learners: {
        items: learnerRows,
        page,
        limit,
        total: Number(totalRows[0]?.cnt) || 0,
        totalPages: Math.ceil((Number(totalRows[0]?.cnt) || 0) / limit)
      }
    };
  }

  // =========================================================================
  // 3. ASSESSMENT-LEVEL ANALYTICS & ITEM ANALYSIS
  // =========================================================================

  public static async getAssessmentsAnalyticsList(options: PaginatedOptions = {}) {
    const orgId = options.organizationId || "org-default";
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        a.id, a.title, a.courseId, a.passingScore, a.totalPoints, a.durationMinutes,
        COUNT(s.id) AS totalAttempts,
        COUNT(DISTINCT s.studentId) AS uniqueStudents,
        SUM(CASE WHEN s.passed = 1 THEN 1 ELSE 0 END) AS passedCount,
        ROUND(AVG(s.percentage), 1) AS averageScore
      FROM assessments a
      LEFT JOIN submissions s ON a.id = s.assessmentId
      WHERE a.organizationId = ? AND a.deletedAt IS NULL
    `;
    const params: any[] = [orgId];

    if (options.search) {
      query += ` AND a.title LIKE ?`;
      params.push(`%${options.search}%`);
    }

    query += ` GROUP BY a.id ORDER BY totalAttempts DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);

    let countQuery = `SELECT COUNT(id) AS cnt FROM assessments WHERE organizationId = ? AND deletedAt IS NULL`;
    const countParams: any[] = [orgId];
    if (options.search) {
      countQuery += ` AND title LIKE ?`;
      countParams.push(`%${options.search}%`);
    }
    const [cntRows]: any = await pool.query(countQuery, countParams);
    const total = Number(cntRows[0]?.cnt) || 0;

    const items = rows.map((r: any) => {
      const totalAttempts = Number(r.totalAttempts) || 0;
      const passedCount = Number(r.passedCount) || 0;
      const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 1000) / 10 : 0;
      return {
        id: r.id,
        title: r.title,
        courseId: r.courseId,
        passingScore: r.passingScore,
        totalPoints: r.totalPoints,
        durationMinutes: r.durationMinutes,
        totalAttempts,
        uniqueStudents: Number(r.uniqueStudents) || 0,
        passedCount,
        passRate,
        averageScore: Number(r.averageScore) || 0
      };
    });

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  public static async getAssessmentAnalytics(assessmentId: string, options: PaginatedOptions = {}) {
    const assessment = await assessmentsDb.findOne({ id: assessmentId });
    if (!assessment) throw new Error("Assessment not found");

    // 1. Overall Performance Statistics
    const [subStats]: any = await pool.query(
      `SELECT 
        COUNT(id) AS totalAttempts,
        COUNT(DISTINCT studentId) AS uniqueStudents,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS passedCount,
        SUM(CASE WHEN passed = 0 THEN 1 ELSE 0 END) AS failedCount,
        ROUND(AVG(percentage), 1) AS averageScore,
        ROUND(MIN(percentage), 1) AS lowestScore,
        ROUND(MAX(percentage), 1) AS highestScore,
        ROUND(AVG(timeTakenSeconds), 0) AS avgTimeTakenSeconds
       FROM submissions 
       WHERE assessmentId = ?`,
      [assessmentId]
    );

    const totalAttempts = Number(subStats[0]?.totalAttempts) || 0;
    const uniqueStudents = Number(subStats[0]?.uniqueStudents) || 0;
    const passedCount = Number(subStats[0]?.passedCount) || 0;
    const failedCount = Number(subStats[0]?.failedCount) || 0;
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 1000) / 10 : 0;
    const failRate = totalAttempts > 0 ? Math.round((failedCount / totalAttempts) * 1000) / 10 : 0;
    const averageScore = Number(subStats[0]?.averageScore) || 0;
    const lowestScore = Number(subStats[0]?.lowestScore) || 0;
    const highestScore = Number(subStats[0]?.highestScore) || 0;
    const avgTimeTakenMinutes = Math.round((Number(subStats[0]?.avgTimeTakenSeconds) || 0) / 60);

    // 2. Score Distribution Buckets
    const [distRows]: any = await pool.query(
      `SELECT 
        SUM(CASE WHEN percentage < 50 THEN 1 ELSE 0 END) AS under50,
        SUM(CASE WHEN percentage >= 50 AND percentage < 70 THEN 1 ELSE 0 END) AS from50to69,
        SUM(CASE WHEN percentage >= 70 AND percentage < 85 THEN 1 ELSE 0 END) AS from70to84,
        SUM(CASE WHEN percentage >= 85 THEN 1 ELSE 0 END) AS from85to100
       FROM submissions 
       WHERE assessmentId = ?`,
      [assessmentId]
    );

    const scoreDistribution = [
      { range: "0 - 49%", count: Number(distRows[0]?.under50) || 0, label: "Remediation Needed" },
      { range: "50 - 69%", count: Number(distRows[0]?.from50to69) || 0, label: "Near Passing" },
      { range: "70 - 84%", count: Number(distRows[0]?.from70to84) || 0, label: "Proficient" },
      { range: "85 - 100%", count: Number(distRows[0]?.from85to100) || 0, label: "Mastery" }
    ];

    // 3. Question Item Analysis (Success Rate, Unanswered Rate, Difficulty Rating)
    const questions = await questionsDb.find({ assessmentId });
    const allSubmissions: any = await pool.query(
      `SELECT answers FROM submissions WHERE assessmentId = ?`,
      [assessmentId]
    );
    const submissionsAnswers = allSubmissions[0].map((s: any) => 
      typeof s.answers === "string" ? JSON.parse(s.answers) : s.answers
    );

    const questionAnalysis = questions.map((q, idx) => {
      let correctAnswersCount = 0;
      let incorrectAnswersCount = 0;
      let unansweredCount = 0;

      for (const ansMap of submissionsAnswers) {
        if (!ansMap || ansMap[q.id] === undefined || ansMap[q.id] === null || ansMap[q.id] === "") {
          unansweredCount++;
        } else {
          // Compare answer against q.correctAnswers
          const studentAns = ansMap[q.id];
          const isCorrect = Array.isArray(q.correctAnswers)
            ? q.correctAnswers.includes(studentAns)
            : String(studentAns).trim().toLowerCase() === String(q.correctAnswers).trim().toLowerCase();

          if (isCorrect) {
            correctAnswersCount++;
          } else {
            incorrectAnswersCount++;
          }
        }
      }

      const totalResponses = correctAnswersCount + incorrectAnswersCount;
      const successRate = totalAttempts > 0 ? Math.round((correctAnswersCount / totalAttempts) * 1000) / 10 : 0;
      const unansweredRate = totalAttempts > 0 ? Math.round((unansweredCount / totalAttempts) * 1000) / 10 : 0;

      let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
      if (successRate >= 80) difficulty = "Easy";
      else if (successRate < 50) difficulty = "Hard";

      return {
        questionId: q.id,
        index: idx + 1,
        questionText: q.questionText || (q as any).prompt || (q as any).title || `Question ${idx + 1}`,
        type: q.type,
        points: q.points || 1,
        correctAnswersCount,
        incorrectAnswersCount,
        unansweredCount,
        successRate,
        unansweredRate,
        difficulty
      };
    });

    // 4. Paginated Submissions Table
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    let subQuery = `
      SELECT 
        s.id,
        s.studentId,
        s.studentName,
        u.email AS studentEmail,
        d.name AS departmentName,
        s.score,
        s.totalPoints,
        s.percentage,
        s.passed,
        s.attemptNumber,
        s.timeTakenSeconds,
        s.submittedAt
      FROM submissions s
      JOIN users u ON s.studentId = u.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE s.assessmentId = ?
    `;
    const params: any[] = [assessmentId];

    if (options.search) {
      subQuery += ` AND (s.studentName LIKE ? OR u.email LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    if (options.status === "passed") {
      subQuery += ` AND s.passed = 1`;
    } else if (options.status === "failed") {
      subQuery += ` AND s.passed = 0`;
    }

    subQuery += ` ORDER BY s.submittedAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [subRows]: any = await pool.query(subQuery, params);

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        passingScore: assessment.passingScore,
        totalPoints: assessment.totalPoints,
        durationMinutes: assessment.durationMinutes
      },
      metrics: {
        totalAttempts,
        uniqueStudents,
        passedCount,
        failedCount,
        passRate,
        failRate,
        averageScore,
        lowestScore,
        highestScore,
        avgTimeTakenMinutes
      },
      scoreDistribution,
      questionAnalysis,
      submissions: {
        items: subRows,
        page,
        limit,
        total: totalAttempts,
        totalPages: Math.ceil(totalAttempts / limit)
      }
    };
  }

  // =========================================================================
  // 4. LEARNER-LEVEL COMPREHENSIVE ANALYTICS
  // =========================================================================

  public static async getLearnerAnalytics(studentId: string, options: AnalyticsFilterOptions = {}) {
    const user = await usersDb.findOne({ id: studentId });
    if (!user) throw new Error("Learner not found");

    // 1. Course Enrollments & Progress
    const [courses]: any = await pool.query(
      `SELECT 
        e.id AS enrollmentId,
        e.courseId,
        c.title AS courseTitle,
        c.category,
        c.thumbnail,
        COALESCE(e.progressPercentage, 0) AS progressPercent,
        e.status,
        e.enrolledAt,
        e.dueDate,
        e.completedAt,
        e.isMandatory,
        CASE 
          WHEN e.dueDate IS NOT NULL AND e.dueDate < NOW() AND e.status != 'completed' THEN 1 
          ELSE 0 
        END AS isOverdue
       FROM enrollments e
       JOIN courses c ON e.courseId = c.id
       WHERE e.studentId = ? AND e.deletedAt IS NULL
       ORDER BY isOverdue DESC, e.enrolledAt DESC`,
      [studentId]
    );

    // 2. Assessment Submissions History
    const [submissions]: any = await pool.query(
      `SELECT 
        s.id AS submissionId,
        s.assessmentId,
        a.title AS assessmentTitle,
        a.passingScore,
        s.score,
        s.totalPoints,
        s.percentage,
        s.passed,
        s.attemptNumber,
        s.submittedAt,
        s.timeTakenSeconds
       FROM submissions s
       JOIN assessments a ON s.assessmentId = a.id
       WHERE s.studentId = ?
       ORDER BY s.submittedAt DESC`,
      [studentId]
    );

    // 3. Certificates Held
    const [certificates]: any = await pool.query(
      `SELECT 
        c.id, c.certificateNumber, c.verificationCode, c.type, c.title,
        c.issuedAt, c.expiresAt, c.status
       FROM certificates c
       WHERE c.studentId = ? AND c.deletedAt IS NULL
       ORDER BY c.issuedAt DESC`,
      [studentId]
    );

    // 4. Recent Lesson Interactions
    const [recentLessons]: any = await pool.query(
      `SELECT 
        p.id, p.courseId, c.title AS courseTitle,
        p.lessonId, l.title AS lessonTitle,
        p.completed, p.completedAt, p.lastAccessedAt, p.timeSpentSeconds
       FROM progress p
       JOIN courses c ON p.courseId = c.id
       JOIN lessons l ON p.lessonId = l.id
       WHERE p.studentId = ?
       ORDER BY p.lastAccessedAt DESC, p.completedAt DESC
       LIMIT 20`,
      [studentId]
    );

    // Aggregate summary
    const totalAssignedCourses = courses.length;
    const completedCourses = courses.filter((c: any) => c.status === "completed" || c.progressPercent >= 100).length;
    const courseCompletionRate = totalAssignedCourses > 0 ? Math.round((completedCourses / totalAssignedCourses) * 1000) / 10 : 0;

    const totalSubmissions = submissions.length;
    const passedAssessments = submissions.filter((s: any) => s.passed).length;
    const assessmentPassRate = totalSubmissions > 0 ? Math.round((passedAssessments / totalSubmissions) * 1000) / 10 : 0;
    const avgAssessmentScore = totalSubmissions > 0 ? Math.round((submissions.reduce((acc: number, s: any) => acc + Number(s.percentage), 0) / totalSubmissions) * 10) / 10 : 0;

    const overdueCount = courses.filter((c: any) => c.isOverdue === 1).length;

    return {
      learner: {
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        departmentId: user.departmentId,
        status: user.status,
        createdAt: user.createdAt
      },
      summary: {
        totalAssignedCourses,
        completedCourses,
        courseCompletionRate,
        totalSubmissions,
        passedAssessments,
        assessmentPassRate,
        avgAssessmentScore,
        overdueCount,
        totalCertificates: certificates.length
      },
      courses,
      submissions,
      certificates,
      recentLessons
    };
  }

  // =========================================================================
  // 5. MANAGER-SCOPED TEAM ANALYTICS
  // =========================================================================

  public static async getManagerTeamAnalytics(managerId: string, options: AnalyticsFilterOptions = {}) {
    const orgId = options.organizationId || "org-default";
    const learnerIds = await OrganizationService.getManagedLearnerIds(managerId, orgId);

    if (learnerIds.length === 0) {
      return {
        teamLearnersCount: 0,
        activeLearnersCount: 0,
        courseStats: { totalAssigned: 0, totalCompleted: 0, completionRate: 0 },
        assessmentStats: { totalAttempts: 0, passRate: 0, averageScore: 0 },
        overdueItemsCount: 0,
        totalCertificates: 0,
        departmentBreakdown: [],
        activityTrend: []
      };
    }

    const placeholders = learnerIds.map(() => "?").join(",");

    // Course stats
    const [cStats]: any = await pool.query(
      `SELECT 
        COUNT(id) AS totalAssigned,
        SUM(CASE WHEN status = 'completed' OR progressPercentage >= 100 THEN 1 ELSE 0 END) AS totalCompleted
       FROM enrollments 
       WHERE studentId IN (${placeholders}) AND deletedAt IS NULL`,
      learnerIds
    );

    // Assessment stats
    const [aStats]: any = await pool.query(
      `SELECT 
        COUNT(id) AS totalAttempts,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS passedCount,
        ROUND(AVG(percentage), 1) AS averageScore
       FROM submissions 
       WHERE studentId IN (${placeholders})`,
      learnerIds
    );

    // Overdue items
    const [overdueRows]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM enrollments 
       WHERE studentId IN (${placeholders}) 
         AND dueDate IS NOT NULL AND dueDate < NOW() 
         AND status NOT IN ('completed', 'revoked') 
         AND (progressPercentage IS NULL OR progressPercentage < 100)
         AND deletedAt IS NULL`,
      learnerIds
    );

    // Certificates
    const [certRows]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM certificates 
       WHERE studentId IN (${placeholders}) AND status = 'active' AND deletedAt IS NULL`,
      learnerIds
    );

    // Department breakdown
    const [deptRows]: any = await pool.query(
      `SELECT 
        COALESCE(d.name, 'Unassigned') AS departmentName,
        COUNT(u.id) AS count
       FROM users u
       LEFT JOIN departments d ON u.departmentId = d.id
       WHERE u.id IN (${placeholders})
       GROUP BY d.name
       ORDER BY count DESC`,
      learnerIds
    );

    const totalAssigned = Number(cStats[0]?.totalAssigned) || 0;
    const totalCompleted = Number(cStats[0]?.totalCompleted) || 0;
    const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 1000) / 10 : 0;

    const totalAttempts = Number(aStats[0]?.totalAttempts) || 0;
    const passedCount = Number(aStats[0]?.passedCount) || 0;
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 1000) / 10 : 0;
    const averageScore = Number(aStats[0]?.averageScore) || 0;

    return {
      teamLearnersCount: learnerIds.length,
      activeLearnersCount: learnerIds.length,
      courseStats: {
        totalAssigned,
        totalCompleted,
        completionRate
      },
      assessmentStats: {
        totalAttempts,
        passedCount,
        passRate,
        averageScore
      },
      overdueItemsCount: Number(overdueRows[0]?.cnt) || 0,
      totalCertificates: Number(certRows[0]?.cnt) || 0,
      departmentBreakdown: deptRows
    };
  }

  // =========================================================================
  // 6. ENTERPRISE REPORT EXPORT ENGINE (CSV / XLSX)
  // =========================================================================

  public static async exportReport(
    reportType: "learners" | "courses" | "assessments" | "overdue",
    format: "csv" | "xlsx",
    options: AnalyticsFilterOptions & { managerId?: string } = {}
  ): Promise<{ filename: string; buffer: Buffer; mimeType: string }> {
    const orgId = options.organizationId || "org-default";
    let dataRows: any[] = [];
    let headers: string[] = [];

    // Filter by manager if role is manager
    let managedFilter = "";
    let managedParams: any[] = [];
    if (options.managerId) {
      const learnerIds = await OrganizationService.getManagedLearnerIds(options.managerId, orgId);
      if (learnerIds.length === 0) {
        managedFilter = " AND 1=0";
      } else {
        const ph = learnerIds.map(() => "?").join(",");
        managedFilter = ` AND u.id IN (${ph})`;
        managedParams = learnerIds;
      }
    }

    if (reportType === "learners") {
      headers = [
        "Learner ID", "Name", "Email", "Department", "Job Title", 
        "Assigned Courses", "Completed Courses", "Completion Rate (%)", "Overdue Items", "Certificates"
      ];

      const [rows]: any = await pool.query(
        `SELECT 
          u.id, u.name, u.email, d.name AS departmentName, u.jobTitle,
          COUNT(e.id) AS assignedCourses,
          SUM(CASE WHEN e.status = 'completed' OR e.progressPercentage >= 100 THEN 1 ELSE 0 END) AS completedCourses,
          SUM(CASE WHEN e.dueDate IS NOT NULL AND e.dueDate < NOW() AND e.status != 'completed' THEN 1 ELSE 0 END) AS overdueCount
         FROM users u
         LEFT JOIN departments d ON u.departmentId = d.id
         LEFT JOIN enrollments e ON u.id = e.studentId AND e.deletedAt IS NULL
         WHERE u.organizationId = ? AND u.role = 'student' AND u.deletedAt IS NULL ${managedFilter}
         GROUP BY u.id
         ORDER BY u.name ASC`,
        [orgId, ...managedParams]
      );

      // Fetch certificate counts
      const [certCounts]: any = await pool.query(
        `SELECT studentId, COUNT(id) AS cnt FROM certificates WHERE organizationId = ? AND status = 'active' GROUP BY studentId`,
        [orgId]
      );
      const certMap = new Map(certCounts.map((c: any) => [c.studentId, Number(c.cnt)]));

      dataRows = rows.map((r: any) => {
        const assigned = Number(r.assignedCourses) || 0;
        const completed = Number(r.completedCourses) || 0;
        const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
        return [
          r.id,
          r.name,
          r.email,
          r.departmentName || "Unassigned",
          r.jobTitle || "Student",
          assigned,
          completed,
          `${rate}%`,
          Number(r.overdueCount) || 0,
          certMap.get(r.id) || 0
        ];
      });
    } else if (reportType === "courses") {
      headers = [
        "Course ID", "Course Title", "Category", "Status", 
        "Total Enrollments", "Starts", "Completions", "Completion Rate (%)", "Avg Completion (Days)"
      ];

      const [rows]: any = await pool.query(
        `SELECT 
          c.id, c.title, c.category, c.status,
          COUNT(e.id) AS totalEnrollments,
          SUM(CASE WHEN e.progressPercentage > 0 OR e.status = 'in_progress' OR e.status = 'completed' THEN 1 ELSE 0 END) AS startsCount,
          SUM(CASE WHEN e.status = 'completed' OR e.progressPercentage >= 100 THEN 1 ELSE 0 END) AS completionsCount,
          ROUND(AVG(CASE WHEN e.completedAt IS NOT NULL THEN TIMESTAMPDIFF(DAY, e.enrolledAt, e.completedAt) ELSE NULL END), 1) AS avgDays
         FROM courses c
         LEFT JOIN enrollments e ON c.id = e.courseId AND e.deletedAt IS NULL
         WHERE c.organizationId = ? AND c.deletedAt IS NULL
         GROUP BY c.id
         ORDER BY totalEnrollments DESC`,
        [orgId]
      );

      dataRows = rows.map((r: any) => {
        const enr = Number(r.totalEnrollments) || 0;
        const comp = Number(r.completionsCount) || 0;
        const rate = enr > 0 ? Math.round((comp / enr) * 100) : 0;
        return [
          r.id,
          r.title,
          r.category,
          r.status,
          enr,
          Number(r.startsCount) || 0,
          comp,
          `${rate}%`,
          r.avgDays !== null ? r.avgDays : "N/A"
        ];
      });
    } else if (reportType === "assessments") {
      headers = [
        "Submission ID", "Learner Name", "Learner Email", "Assessment Title", 
        "Score", "Total Points", "Percentage (%)", "Result", "Attempt", "Submitted Date"
      ];

      const [rows]: any = await pool.query(
        `SELECT 
          s.id, s.studentName, u.email AS studentEmail, a.title AS assessmentTitle,
          s.score, s.totalPoints, s.percentage, s.passed, s.attemptNumber, s.submittedAt
         FROM submissions s
         JOIN users u ON s.studentId = u.id
         JOIN assessments a ON s.assessmentId = a.id
         WHERE s.organizationId = ? ${managedFilter}
         ORDER BY s.submittedAt DESC
         LIMIT 2000`,
        [orgId, ...managedParams]
      );

      dataRows = rows.map((r: any) => [
        r.id,
        r.studentName,
        r.studentEmail,
        r.assessmentTitle,
        r.score,
        r.totalPoints,
        `${r.percentage}%`,
        r.passed ? "PASSED" : "FAILED",
        r.attemptNumber || 1,
        new Date(r.submittedAt).toLocaleString()
      ]);
    } else if (reportType === "overdue") {
      headers = [
        "Item Type", "Item Title", "Learner Name", "Learner Email", 
        "Department", "Due Date", "Days Overdue", "Is Mandatory"
      ];

      const [rows]: any = await pool.query(
        `SELECT 
          'Course' AS itemType, c.title AS itemTitle, u.name AS studentName, u.email AS studentEmail,
          d.name AS departmentName, e.dueDate, e.isMandatory,
          DATEDIFF(NOW(), e.dueDate) AS daysOverdue
         FROM enrollments e
         JOIN courses c ON e.courseId = c.id
         JOIN users u ON e.studentId = u.id
         LEFT JOIN departments d ON u.departmentId = d.id
         WHERE e.organizationId = ? 
           AND e.dueDate IS NOT NULL AND e.dueDate < NOW() 
           AND e.status NOT IN ('completed', 'revoked')
           AND (e.progressPercentage IS NULL OR e.progressPercentage < 100)
           AND e.deletedAt IS NULL ${managedFilter}
         ORDER BY daysOverdue DESC`,
        [orgId, ...managedParams]
      );

      dataRows = rows.map((r: any) => [
        r.itemType,
        r.itemTitle,
        r.studentName,
        r.studentEmail,
        r.departmentName || "Unassigned",
        new Date(r.dueDate).toLocaleDateString(),
        Number(r.daysOverdue) || 1,
        r.isMandatory ? "YES" : "NO"
      ]);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `mrtechlms_${reportType}_report_${timestamp}.${format}`;

    if (format === "csv") {
      // Escape and format RFC 4180 CSV
      const csvLines = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
        ...dataRows.map(row => 
          row.map((cell: any) => {
            const str = cell !== null && cell !== undefined ? String(cell) : "";
            return `"${str.replace(/"/g, '""')}"`;
          }).join(",")
        )
      ];
      const buffer = Buffer.from(csvLines.join("\r\n"), "utf-8");
      return {
        filename,
        buffer,
        mimeType: "text/csv; charset=utf-8"
      };
    } else {
      // Generate Excel XLSX
      const sheetData = [headers, ...dataRows];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return {
        filename,
        buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };
    }
  }
}
