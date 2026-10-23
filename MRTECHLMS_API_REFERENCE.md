# MRTECHLMS — Complete REST API Reference

**Project Path:** `D:\malla\office\MRTECHLMS`  
**Base URL:** `http://localhost:3000` (or configured `APP_URL`)  
**Authentication Scheme:** `Bearer <JWT_TOKEN>` via `Authorization` header  
**Response Formats:** Standard JSON (`{ data, error, message }`)

---

## 1. Authentication & Session APIs (`/api/auth`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | None | Public | User authentication with portal selection.<br>`{ email, password, portal?: "student" \| "admin" }` | `{ token: string, user: User }`<br>*(Rejects `TRAINER` role with HTTP 403)* |
| `POST` | `/api/auth/register-admin` | None | Public | Initial/Bootstrap Administrator provisioning.<br>`{ name, email, password, secretKey }` | `{ message: string, user: User }` |
| `GET` | `/api/auth/me` | Bearer | Any | Retrieves authenticated profile from current token. | `User` object (sanitized, passwordHash excluded) |
| `PUT` | `/api/auth/profile` | Bearer | Any | Updates own name, password, profile photo.<br>`{ name?, password?, profilePhoto? }` | `{ message: string, user: User }` |

---

## 2. Admin User Management & Provisioning (`/api/admin/users`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/admin/users` | Bearer | `ADMIN` | Lists all users with optional filtering.<br>Query: `role`, `status`, `search` | `User[]` |
| `POST` | `/api/admin/users` | Bearer | `ADMIN` | Provisions single user (Student, Admin, Manager).<br>`{ name, email, role, password, departmentId?, managerId? }` | `User` (Created user with hashed password) |
| `PUT` | `/api/admin/users/:id/status` | Bearer | `ADMIN` | Suspends or activates a user account.<br>`{ status: "active" \| "suspended" }` | `{ message: string, user: User }` |
| `PUT` | `/api/admin/users/:id/department` | Bearer | `ADMIN` | Assigns user to department and manager.<br>`{ departmentId, managerId? }` | `{ message: string }` |
| `DELETE` | `/api/admin/users/:id` | Bearer | `ADMIN` | Soft-deletes user (`deletedAt = NOW()`). | `{ message: "User deleted successfully" }` |
| `POST` | `/api/admin/users/bulk-import` | Bearer | `ADMIN` | Multipart upload of `.xlsx` spreadsheet for bulk provisioning. | `{ importedCount: number, errors: string[] }` |
| `GET` | `/api/admin/users/:studentId/access` | Bearer | `ADMIN` | Full access matrix for single student (courses, standalone exams). | `{ coursesList: any[], assessmentsList: any[] }` |

---

## 3. Course Access Allocation & Revocation (`/api/admin/enrollments`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/admin/users/:studentId/enrollments` | Bearer | `ADMIN` | Lists enrolled courses for a student. | `Array<{ enrollmentId, courseId, enrolledAt, courseTitle, category, instructorName }>` |
| `POST` | `/api/admin/users/:studentId/enrollments` | Bearer | `ADMIN` | Grants individual course access to student.<br>`{ courseId, dueDate?, isMandatory? }` | `Enrollment` record |
| `DELETE` | `/api/admin/users/:studentId/enrollments/:courseId` | Bearer | `ADMIN` | Revokes course access from student (sets `status='revoked'`).<br>Optional body: `{ reason? }` | `{ message: "Course access revoked successfully" }` |
| `POST` | `/api/admin/enrollments/bulk` | Bearer | `ADMIN` | Bulk assigns course to array of student IDs.<br>`{ courseId, studentIds: string[], dueDate?, isMandatory? }` | `{ message: string, assignedCount: number }` |
| `POST` | `/api/admin/enrollments/group` | Bearer | `ADMIN` | Assigns course to all members of a group.<br>`{ courseId, groupId, dueDate?, isMandatory? }` | `{ message: string, assignedCount: number, groupName: string }` |
| `POST` | `/api/admin/enrollments/revoke` | Bearer | `ADMIN` | Alternative POST body endpoint for revocation.<br>`{ courseId, studentId, reason? }` | `{ message: "Course access revoked successfully" }` |
| `PUT` | `/api/admin/enrollments/:enrollmentId` | Bearer | `ADMIN` | Updates enrollment deadlines and mandatory flag.<br>`{ dueDate?, isMandatory?: boolean }` | `Enrollment` record |
| `GET` | `/api/admin/courses/:id/access` | Bearer | `ADMIN` | Full access matrix for a course across all enrolled students. | `Array<{ studentId, studentName, studentEmail, status, rawStatus, progressPercentage, ... }>` |

---

## 4. Course Management & Authoring Studio (`/api/admin/courses`, `/api/admin/modules`, `/api/admin/lessons`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/admin/courses` | Bearer | `ADMIN` | Retrieves all courses regardless of publication status. | `Course[]` |
| `POST` | `/api/admin/courses` | Bearer | `ADMIN` | Creates new course draft.<br>`{ title, category, description, shortDescription?, thumbnail?, banner?, difficulty? }` | `Course` |
| `GET` | `/api/admin/courses/:id` | Bearer | `ADMIN` | Comprehensive course authoring view with modules, lessons, and exams. | `{ course, modules: Module[], lessons: Lesson[], finalAssessment: Assessment }` |
| `PUT` | `/api/admin/courses/:id` | Bearer | `ADMIN` | Updates course metadata and status.<br>`{ title, category, description, status: "draft" \| "review" \| "published" \| "archived", ... }` | `Course` |
| `DELETE` | `/api/admin/courses/:id` | Bearer | `ADMIN` | Soft-deletes course and its attached curriculum. | `{ message: "Course deleted successfully" }` |
| `POST` | `/api/admin/courses/:id/modules` | Bearer | `ADMIN` | Appends module to course curriculum.<br>`{ title, description?, order? }` | `Module` |
| `PUT` | `/api/admin/modules/:id` | Bearer | `ADMIN` | Updates module title and description. | `Module` |
| `DELETE` | `/api/admin/modules/:id` | Bearer | `ADMIN` | Deletes module and cascades to lessons. | `{ message: "Module deleted" }` |
| `POST` | `/api/admin/modules/:moduleId/lessons` | Bearer | `ADMIN` | Adds lesson under a module.<br>`{ title, type: "video" \| "text" \| "pdf" \| "quiz" \| "code", durationMinutes, content?, videoUrl?, fileUrl?, codingPrompt? }` | `Lesson` |
| `PUT` | `/api/admin/lessons/:id` | Bearer | `ADMIN` | Updates lesson content, duration, and resources. | `Lesson` |
| `DELETE` | `/api/admin/lessons/:id` | Bearer | `ADMIN` | Soft-deletes lesson. | `{ message: "Lesson deleted" }` |
| `POST` | `/api/admin/courses/:id/reorder-modules` | Bearer | `ADMIN` | Reorders curriculum modules.<br>`{ moduleIds: string[] }` | `{ message: "Modules reordered" }` |
| `POST` | `/api/admin/modules/:id/reorder-lessons` | Bearer | `ADMIN` | Reorders lessons within a module.<br>`{ lessonIds: string[] }` | `{ message: "Lessons reordered" }` |
| `POST` | `/api/admin/courses/upload-asset` | Bearer | `ADMIN` | Multipart upload for video, thumbnail, or PDF assets. | `{ url: string, filename: string }` |

---

## 5. Assessment & Question Authoring (`/api/admin/assessments`, `/api/admin/questions`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/admin/assessments` | Bearer | `ADMIN` | Lists all assessments across the academy. | `Assessment[]` |
| `POST` | `/api/admin/assessments` | Bearer | `ADMIN` | Creates standalone or course-linked exam.<br>`{ title, description, durationMinutes, passingScore, courseId?, type? }` | `Assessment` |
| `GET` | `/api/admin/assessments/:id` | Bearer | `ADMIN` | Fetches assessment with all authored questions. | `{ assessment: Assessment, questions: Question[] }` |
| `PUT` | `/api/admin/assessments/:id` | Bearer | `ADMIN` | Updates assessment parameters and passing criteria. | `Assessment` |
| `DELETE` | `/api/admin/assessments/:id` | Bearer | `ADMIN` | Soft-deletes assessment. | `{ message: "Assessment deleted" }` |
| `POST` | `/api/admin/assessments/:id/questions` | Bearer | `ADMIN` | Adds question to assessment.<br>`{ questionText, type: "single_choice" \| "multiple_choice" \| "true_false", options: string[], correctAnswers: string[], points, explanation? }` | `Question` |
| `PUT` | `/api/admin/questions/:id` | Bearer | `ADMIN` | Updates question text, answer options, points. | `Question` |
| `DELETE` | `/api/admin/questions/:id` | Bearer | `ADMIN` | Deletes question from assessment. | `{ message: "Question deleted" }` |
| `GET` | `/api/admin/assessments/:id/submissions` | Bearer | `ADMIN` | Lists student attempt history and scorecards. | `Submission[]` |
| `GET` | `/api/admin/assessments/submissions/:submissionId` | Bearer | `ADMIN` | Detailed question-by-question breakdown of student submission. | `{ submission, questions, student }` |
| `GET` | `/api/admin/assessments/:id/access` | Bearer | `ADMIN` | Access matrix for standalone assessment. | `Array<{ studentId, studentName, assignedAt, ... }>` |
| `POST` | `/api/admin/users/:studentId/assessment-access/:assessmentId` | Bearer | `ADMIN` | Assigns standalone assessment to student. | `AssessmentAssignment` |
| `DELETE` | `/api/admin/users/:studentId/assessment-access/:assessmentId` | Bearer | `ADMIN` | Revokes standalone assessment access from student. | `{ message: "Access revoked" }` |

---

## 6. Student Learning & Consumption APIs (`/api/student`, `/api/courses`, `/api/assessments`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/courses` | None | Public | Public catalog listing published courses.<br>*(Filters `{ status: "published" }`)* | `Course[]` |
| `GET` | `/api/student/dashboard` | Bearer | `STUDENT` | Main dashboard feed: assigned courses, progress, continue learning, recommended tracks. | `{ assignedCourses: any[], continueLearning: any, quickStats: any }` |
| `GET` | `/api/courses/:id` | Bearer | `STUDENT` \| `ADMIN` | Course player boot. Checks eligibility and revocation.<br>*(Returns 403 if revoked)* | `{ course: Course, modules: Module[], lessons: Lesson[], reviews: Review[] }` |
| `GET` | `/api/student/courses/:id/overview` | Bearer | `STUDENT` | Course syllabus modal overview and learning objectives. | `{ course, modules, totalLessons, completedLessonsCount, finalAssessment }` |
| `GET` | `/api/student/courses/:id/progress` | Bearer | `STUDENT` | Progress items for course player checkboxes. | `Array<{ lessonId: string, completed: boolean, lastAccessedAt }>` |
| `GET` | `/api/student/courses/:id/resume` | Bearer | `STUDENT` | Last position and resume lesson ID. | `{ lastLessonId: string, lastPositionSeconds: number }` |
| `POST` | `/api/lessons/:id/complete` | Bearer | `STUDENT` | Marks lesson completed and calculates course progress %. | `{ message: "Lesson marked completed", progressPercentage: number }` |
| `GET` | `/api/assessments/:id` | Bearer | `STUDENT` | Fetches examination questions with randomized order (correct answers stripped). | `{ assessment: Assessment, questions: Question[] }` |
| `POST` | `/api/assessments/:id/submit` | Bearer | `STUDENT` | Submits answers, computes score, evaluates pass/fail.<br>`{ answers: { [questionId: string]: string[] } }` | `{ score: number, totalPoints: number, percentage: number, passed: boolean, submissionId: string }` |
| `GET` | `/api/student/assessments` | Bearer | `STUDENT` | Lists assigned exams and past submission scorecards. | `{ assigned: any[], pastSubmissions: Submission[] }` |
| `POST` | `/api/courses/:id/reviews` | Bearer | `STUDENT` | Submits course rating and review.<br>`{ rating: number, comment: string }` | `Review` |

---

## 7. Coding Practice & Execution Sandbox (`/api/coding`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/coding/challenges` | Bearer | `STUDENT` | Returns coding curriculum problems and solved status. | `CodingChallenge[]` |
| `GET` | `/api/coding/challenges/:id` | Bearer | `STUDENT` | Fetches problem description, starter code, test cases. | `CodingChallenge` |
| `POST` | `/api/coding/run` | Bearer | `STUDENT` | Runs code against public test cases in sandbox.<br>`{ challengeId, language, code }` | `{ testResults: TestCaseResult[], allPassed: boolean, stdout: string }` |
| `POST` | `/api/coding/submit` | Bearer | `STUDENT` | Evaluates against hidden test cases and records score.<br>`{ challengeId, language, code }` | `{ status: "accepted" \| "failed", passedCases: number, totalCases: number }` |
| `GET` | `/api/coding/challenges/:id/code` | Bearer | `STUDENT` | Loads student's saved in-progress solution. | `{ code: string, language: string }` |
| `POST` | `/api/coding/challenges/:id/code` | Bearer | `STUDENT` | Auto-saves student code drafts in Monaco editor. | `{ message: "Draft saved" }` |
| `GET` | `/api/coding/playground/programs` | Bearer | `STUDENT` | Lists student's personal playground programs. | `StudentPlaygroundProgram[]` |
| `POST` | `/api/coding/playground/programs` | Bearer | `STUDENT` | Creates or updates playground code file. | `StudentPlaygroundProgram` |

---

## 8. Certification & Verification (`/api/certificates`, `/api/verify-certificate`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/certificates/my-certificates` | Bearer | `STUDENT` | Lists active and valid certificates awarded to student. | `Certificate[]` |
| `GET` | `/api/certificates/:id/pdf` | Bearer | Any | Streams dynamic vector PDF generated via PDFKit. | `application/pdf` binary stream |
| `GET` | `/api/verify-certificate/:code` | None | Public | Validates authenticity via verification code or ID.<br>*(PII strictly masked)* | `{ found: boolean, verification: { valid: boolean, recipientName, title, issuedAt, ... } }` |
| `GET` | `/api/admin/certificates` | Bearer | `ADMIN` | Admin certificates register with search, filter, and stats. | `{ certificates: Certificate[], stats: any }` |
| `POST` | `/api/admin/certificates/issue` | Bearer | `ADMIN` | Manually issues certificate to student.<br>`{ studentId, courseId?, learningPathId?, templateStyle? }` | `Certificate` |
| `POST` | `/api/admin/certificates/:id/revoke` | Bearer | `ADMIN` | Revokes certificate with documented reason.<br>`{ reason: string }` | `Certificate` (`status: "revoked"`) |
| `POST` | `/api/admin/certificates/:id/reissue` | Bearer | `ADMIN` | Restores revoked certificate or extends validity. | `Certificate` (`status: "active"`) |

---

## 9. Gamification, Leaderboards & Badges (`/api/gamification`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/gamification/profile` | Bearer | `STUDENT` | Student gamification profile: points, level, rank, streak. | `{ profile, currentRank, streak, badges }` |
| `GET` | `/api/gamification/leaderboard` | Bearer | Any | Global or departmental student leaderboard.<br>Query: `scope: "global" \| "department"` | `Array<{ rank, name, points, level, avatar }>` |
| `GET` | `/api/gamification/badges` | Bearer | Any | Academy badge catalog with unlock requirements. | `GamificationBadge[]` |
| `GET` | `/api/admin/gamification/config` | Bearer | `ADMIN` | Admin configuration for point reward multipliers. | `GamificationConfig` |
| `PUT` | `/api/admin/gamification/config` | Bearer | `ADMIN` | Updates point triggers (lesson complete, quiz pass). | `GamificationConfig` |
| `POST` | `/api/admin/gamification/award-points` | Bearer | `ADMIN` | Manually awards bonus points to student. | `{ message: string, newTotal: number }` |

---

## 10. Analytics & Reporting (`/api/analytics`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Bearer | `ADMIN` | High-level KPI metrics: active students, completions, revenue. | `{ usersCount, coursesCount, enrollmentsCount, ... }` |
| `GET` | `/api/admin/analytics/overview` | Bearer | `ADMIN` | 14-day enrollment velocity, pass rates, course popularity. | Detailed analytics aggregation object |
| `GET` | `/api/admin/analytics/export/courses` | Bearer | `ADMIN` | Downloads Excel report of course performance. | `.xlsx` binary stream |
| `GET` | `/api/admin/analytics/export/users` | Bearer | `ADMIN` | Downloads Excel report of user enrollments and progress. | `.xlsx` binary stream |

---

## 11. Multi-Tenancy & Organization Management (`/api/admin/organizations`, `/api/admin/departments`, `/api/admin/cohorts`, `/api/admin/groups`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/admin/organizations` | Bearer | `ADMIN` | Lists tenant organizations. | `Organization[]` |
| `PUT` | `/api/admin/organization/branding` | Bearer | `ADMIN` | Updates organization logo, theme palette, and portal name. | `Organization` |
| `GET` | `/api/admin/departments` | Bearer | `ADMIN` | Lists departments under organization. | `Department[]` |
| `POST` | `/api/admin/departments` | Bearer | `ADMIN` | Creates department with assigned manager. | `Department` |
| `GET` | `/api/admin/cohorts` | Bearer | `ADMIN` | Lists student training cohorts. | `Cohort[]` |
| `POST` | `/api/admin/cohorts` | Bearer | `ADMIN` | Creates cohort with start and graduation dates. | `Cohort` |
| `GET` | `/api/admin/groups` | Bearer | `ADMIN` | Lists user assignment groups. | `Group[]` |
| `POST` | `/api/admin/groups` | Bearer | `ADMIN` | Creates user group for bulk course assignments. | `Group` |
| `POST` | `/api/admin/groups/:id/members` | Bearer | `ADMIN` | Adds students to group.<br>`{ userIds: string[] }` | `{ message: string, addedCount: number }` |

---

## 12. Notifications & Reminders (`/api/notifications`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/notifications` | Bearer | Any | Lists user notifications.<br>Query: `unreadOnly: boolean` | `NotificationItem[]` |
| `PUT` | `/api/notifications/:id/read` | Bearer | Any | Marks specific notification as read. | `{ message: "Marked as read" }` |
| `PUT` | `/api/notifications/read-all` | Bearer | Any | Marks all notifications as read for current user. | `{ message: "All marked as read" }` |
| `GET` | `/api/notifications/preferences` | Bearer | Any | Fetches user notification delivery preferences. | `NotificationPreferences` |
| `PUT` | `/api/notifications/preferences` | Bearer | Any | Updates email/in-app alert toggles. | `NotificationPreferences` |
| `POST` | `/api/admin/notifications/broadcast` | Bearer | `ADMIN` | Sends system broadcast to all students. | `{ message: "Broadcast sent" }` |

---

## 13. AI Mentorship & Generative Services (`/api/ai`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `POST` | `/api/ai/ask-mentor` | Bearer | `STUDENT` | Conversational AI tutor session grounded in course curriculum.<br>`{ courseId, message, conversationHistory? }` | `{ reply: string, suggestedTopics: string[] }` |
| `POST` | `/api/ai/explain-concept` | Bearer | `STUDENT` | Explains difficult lesson topic using Gemini 2.5 Flash.<br>`{ lessonId, questionText }` | `{ explanation: string, codeExample?: string }` |
| `POST` | `/api/ai/coding-hint` | Bearer | `STUDENT` | Generates progressive coding hints without giving away solutions.<br>`{ challengeId, userCode }` | `{ hint: string, hintLevel: number }` |
| `POST` | `/api/admin/ai/generate-course` | Bearer | `ADMIN` | Generates complete course syllabus and lesson outlines from topic prompt. | `GeneratedCourseDraft` |
| `POST` | `/api/admin/ai/generate-quiz` | Bearer | `ADMIN` | Generates 5–10 MCQ questions with distractors and explanations. | `Question[]` |

---

## 14. Enterprise Integrations & Public API v1 (`/api/integrations`, `/api/v1`)

| Method | Endpoint | Auth | Role | Purpose & Body Parameters | Response Structure |
|---|---|---|---|---|---|
| `GET` | `/api/integrations/api-keys` | Bearer | `ADMIN` | Lists provisioned enterprise API keys. | `ApiKey[]` |
| `POST` | `/api/integrations/api-keys` | Bearer | `ADMIN` | Generates new API key with granular scopes.<br>`{ name, scopes: string[] }` | `{ apiKey: string, keyRecord: ApiKey }` |
| `DELETE` | `/api/integrations/api-keys/:id` | Bearer | `ADMIN` | Revokes API key. | `{ message: "Key revoked" }` |
| `GET` | `/api/v1/courses` | API Key | `courses:read` | Public API endpoint listing published courses. | `{ data: Course[], pagination: any }` |
| `POST` | `/api/v1/enrollments` | API Key | `enrollments:write` | Public API endpoint for external ERP enrollment.<br>`{ studentEmail, courseId }` | `{ message: string, enrollment: Enrollment }` |
| `POST` | `/api/integrations/webhooks/test` | Bearer | `ADMIN` | Dispatches test webhook payload to configured URL. | `{ success: boolean, statusCode: number, latencyMs: number }` |

---

## 15. Legacy Trainer Endpoints (`/api/trainer/*`)

> [!WARNING]
> The `TRAINER` login role is explicitly deactivated at `/api/auth/login`. These endpoints remain in `server.ts` for backward compatibility, accessible **only** to users with the `ADMIN` role.

| Method | Endpoint | Auth | Role | Legacy Purpose |
|---|---|---|---|---|
| `GET` | `/api/trainer/courses` | Bearer | `ADMIN` (formerly `TRAINER`) | Lists courses assigned to instructor. |
| `POST` | `/api/trainer/courses` | Bearer | `ADMIN` (formerly `TRAINER`) | Instructor course submission for review. |
| `PUT` | `/api/trainer/courses/:id` | Bearer | `ADMIN` (formerly `TRAINER`) | Instructor updates own course content. |
| `GET` | `/api/trainer/courses/:courseId/students` | Bearer | `ADMIN` (formerly `TRAINER`) | Lists students enrolled in course. |
| `GET` | `/api/trainer/assessments/:id/submissions`| Bearer | `ADMIN` (formerly `TRAINER`) | Reviews exam attempts for course. |
