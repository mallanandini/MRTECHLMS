# MR-TECHNOLOGIES LMS — Complete Technical Architecture Document

## 1. Project Overview & Folder Structure

```
MRTECHLMS/
├── .env                              # Environment configuration (DB credentials, GEMINI_API_KEY, PORT)
├── .env.example                      # Template for required environment variables
├── .gitignore                        # Git ignore specifications
├── index.html                        # Single Page Application HTML shell
├── LMS_ARCHITECTURE.md               # Technical architecture and system documentation
├── package.json                      # NPM dependencies and script targets
├── package-lock.json                 # Lockfile for reproducible dependency tree
├── tsconfig.json                     # TypeScript compiler configuration (ESNext, Bundler, React JSX)
├── tsconfig.node.json                # Node/Vite specific TypeScript config
├── vite.config.ts                    # Vite dev server, React plugin, Tailwind CSS plugin, Path aliases
├── data/                             # Cold-start JSON seed records (used only on empty DB initialization)
│   ├── assessments.json              # Mock assessments seed data
│   ├── blogs.json                    # Mock blog posts seed data
│   ├── courses.json                  # Mock course catalog seed data
│   ├── lessons.json                  # Mock lesson curriculum seed data
│   ├── modules.json                  # Mock course module units seed data
│   ├── questions.json                # Mock quiz question seed data
│   └── users.json                    # Initial seed user accounts
├── server/                           # Backend Database & Abstracted SQL Collection Layer
│   ├── mysql.ts                      # mysql2/promise connection pool reading from environment variables
│   ├── db.ts                         # Generic MySQLCollection<T> with CRUD and JSON serialization
│   └── seed.ts                       # DDL schema bootstrap & cold-start JSON migration runner
├── server.ts                         # Express application, REST endpoints, RBAC middleware, Vite integration
└── src/                              # React 19 Frontend Application (TypeScript + Tailwind CSS)
    ├── App.tsx                       # Main application state, session lifecycle, router container
    ├── index.css                     # Tailwind CSS v4 directives and typography font declarations
    ├── main.tsx                      # DOM entry point mounting <StrictMode><App /></StrictMode>
    ├── types.ts                      # Shared TypeScript data models, enums, and interfaces
    └── components/                   # Functional React View Components
        ├── AdminConsole.tsx          # System oversight, user suspension, course publishing controls
        ├── AssessmentConsole.tsx     # Student assessment catalog, scores, and exam launcher
        ├── AssessmentViewer.tsx      # Timed quiz runner with scoring & feedback
        ├── BlogPortal.tsx            # Community articles, discussion comments, bookmarks, like counts
        ├── CodingPractice.tsx        # Interactive code editor, test runner, algorithm practice
        ├── CoursePlayer.tsx          # Video/text/coding syllabus player with reviews and AI explainer
        ├── ProfileConsole.tsx        # Student account profile management, avatar, password update
        ├── Sidebar.tsx               # Role-aware sidebar navigation and brand headers
        ├── StudentDashboard.tsx      # Student metrics, ongoing courses, study progress, AI mentor
        └── TrainerConsole.tsx        # Course builder, module/lesson curriculum authoring console
```

---

## 2. Database Schema (All 13 MySQL Tables)

The application uses **MySQL 8.0+** (`InnoDB` storage engine, `utf8mb4` character set).

### Table 1: `users`
Stores all platform accounts across the three supported roles.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique user UUID |
| `name` | VARCHAR(255) | NO | *None* | Full display name |
| `email` | VARCHAR(255) | NO | Unique Index | Unique login email |
| `role` | ENUM('student', 'trainer', 'admin') | NO | *None* | Platform permission role |
| `profilePhoto` | TEXT | YES | NULL | URL or base64 profile image |
| `createdAt` | VARCHAR(50) | NO | *None* | ISO 8601 creation timestamp |
| `status` | ENUM('active', 'suspended') | YES | 'active' | Account accessibility state |
| `bookmarkedBlogIds` | JSON | YES | NULL | Array of bookmarked blog IDs |
| `passwordHash` | VARCHAR(255) | NO | *None* | SHA-256 hashed password string |

---

### Table 2: `courses`
Stores academic courses created by trainers and approved by administrators.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique course UUID |
| `title` | VARCHAR(255) | NO | *None* | Course headline title |
| `description` | TEXT | NO | *None* | Detailed syllabus description |
| `thumbnail` | TEXT | YES | NULL | Card preview image URL |
| `banner` | TEXT | YES | NULL | Header banner image URL |
| `instructorId` | VARCHAR(36) | NO | FK -> `users(id)` | Authoring trainer ID (RESTRICT on delete) |
| `instructorName` | VARCHAR(255) | NO | *None* | Cached instructor display name |
| `category` | VARCHAR(100) | NO | *None* | Academic subject category |
| `requirements` | JSON | YES | NULL | Array of prerequisite strings |
| `skillsCovered` | JSON | YES | NULL | Array of target competency strings |
| `status` | ENUM('draft', 'published', 'rejected') | YES | 'draft' | Publishing lifecycle state |
| `isFeatured` | BOOLEAN | YES | FALSE | Flag for promotional placement |
| `rating` | DECIMAL(3,2) | YES | 5.00 | Aggregate rating (1.00 - 5.00) |
| `reviewsCount` | INT | YES | 0 | Total number of student reviews |
| `createdAt` | VARCHAR(50) | NO | *None* | ISO 8601 creation timestamp |

---

### Table 3: `modules`
Represents hierarchical chapters/sections inside a course.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique module UUID |
| `courseId` | VARCHAR(36) | NO | FK -> `courses(id)` | Parent course ID (CASCADE on delete) |
| `title` | VARCHAR(255) | NO | *None* | Section/Chapter title |
| `order` | INT | NO | *None* | Display sorting index |

---

### Table 4: `lessons`
Individual learning units (video lectures, coding exercises, reading materials) inside a module.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique lesson UUID |
| `moduleId` | VARCHAR(36) | NO | FK -> `modules(id)` | Parent module ID (CASCADE on delete) |
| `courseId` | VARCHAR(36) | NO | FK -> `courses(id)` | Parent course ID (CASCADE on delete) |
| `title` | VARCHAR(255) | NO | *None* | Lesson title |
| `type` | ENUM('video', 'pdf', 'image', 'text', 'coding') | NO | *None* | Delivery format |
| `content` | TEXT | YES | NULL | Markdown/HTML lecture notes |
| `videoUrl` | TEXT | YES | NULL | Streaming video URL |
| `fileUrl` | TEXT | YES | NULL | Supplementary PDF/doc attachment URL |
| `codingPrompt` | JSON | YES | NULL | Coding problem definition & test cases |
| `order` | INT | NO | *None* | Display ordering sequence |
| `durationMinutes` | INT | NO | *None* | Estimated completion time |

---

### Table 5: `enrollments`
Tracks student course registrations.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique enrollment UUID |
| `studentId` | VARCHAR(36) | NO | FK -> `users(id)` | Enrolled student ID (CASCADE on delete) |
| `courseId` | VARCHAR(36) | NO | FK -> `courses(id)` | Enrolled course ID (CASCADE on delete) |
| `enrolledAt` | VARCHAR(50) | NO | *None* | Registration timestamp |
| `completedAt` | VARCHAR(50) | YES | NULL | Course completion timestamp |

*Unique Constraint:* `student_course_uniq (studentId, courseId)`

---

### Table 6: `progress`
Granular completion status and time investment per student per lesson.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique progress UUID |
| `studentId` | VARCHAR(36) | NO | FK -> `users(id)` | Student ID (CASCADE on delete) |
| `courseId` | VARCHAR(36) | NO | FK -> `courses(id)` | Course ID (CASCADE on delete) |
| `lessonId` | VARCHAR(36) | NO | FK -> `lessons(id)` | Lesson ID (CASCADE on delete) |
| `completed` | BOOLEAN | YES | FALSE | Completion flag |
| `completedAt` | VARCHAR(50) | YES | NULL | Completion timestamp |
| `timeSpentSeconds` | INT | YES | 0 | Accumulated study duration |

*Unique Constraint:* `student_lesson_uniq (studentId, lessonId)`

---

### Table 7: `assessments`
Quizzes and evaluations attached to courses or specific modules.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique assessment UUID |
| `courseId` | VARCHAR(36) | NO | FK -> `courses(id)` | Target course ID (CASCADE on delete) |
| `moduleId` | VARCHAR(36) | YES | FK -> `modules(id)` | Target module ID (SET NULL on delete) |
| `title` | VARCHAR(255) | NO | *None* | Quiz title |
| `description` | TEXT | NO | *None* | Overview & instructions |
| `durationMinutes` | INT | NO | *None* | Time limit |
| `passingScore` | INT | NO | *None* | Minimum passing percentage |
| `totalPoints` | INT | NO | *None* | Maximum available marks |
| `questionsCount` | INT | NO | *None* | Number of questions in assessment |
| `createdAt` | VARCHAR(50) | NO | *None* | Creation timestamp |
| `status` | ENUM('published', 'draft') | YES | 'draft' | Assessment visibility state |

---

### Table 8: `questions`
Question bank records linked to assessments.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique question UUID |
| `assessmentId` | VARCHAR(36) | NO | FK -> `assessments(id)` | Assessment ID (CASCADE on delete) |
| `type` | ENUM('mcq_single', 'mcq_multi', 'true_false', 'fill_blanks', 'subjective') | NO | *None* | Question format |
| `questionText` | TEXT | NO | *None* | Question stem |
| `options` | JSON | YES | NULL | Array of answer options |
| `correctAnswers` | JSON | NO | *None* | Array of correct answer keys/strings |
| `points` | INT | NO | *None* | Marks allocated |
| `negativePoints` | INT | YES | 0 | Penalty for incorrect answer |

---

### Table 9: `submissions`
Historical quiz attempts by students with scored answers.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique submission UUID |
| `assessmentId` | VARCHAR(36) | NO | FK -> `assessments(id)` | Assessment ID (CASCADE on delete) |
| `studentId` | VARCHAR(36) | NO | FK -> `users(id)` | Student ID (CASCADE on delete) |
| `studentName` | VARCHAR(255) | NO | *None* | Cached student name |
| `answers` | JSON | NO | *None* | Student's submitted answers object |
| `score` | INT | NO | *None* | Achieved score |
| `totalPoints` | INT | NO | *None* | Maximum score possible |
| `passed` | BOOLEAN | NO | *None* | Pass/fail indicator |
| `submittedAt` | VARCHAR(50) | NO | *None* | Submission timestamp |
| `timeTakenSeconds` | INT | NO | *None* | Total time elapsed in seconds |

---

### Table 10: `coding_submissions`
Code submissions executed in the coding practice sandbox.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique submission UUID |
| `studentId` | VARCHAR(36) | NO | FK -> `users(id)` | Student ID (CASCADE on delete) |
| `studentName` | VARCHAR(255) | NO | *None* | Cached student name |
| `problemId` | VARCHAR(100) | NO | *None* | Coding problem identifier |
| `language` | VARCHAR(50) | NO | *None* | Programming language (python/js) |
| `code` | TEXT | NO | *None* | Source code submitted |
| `status` | ENUM('passed', 'failed', 'error') | NO | *None* | Execution result |
| `passedTests` | INT | NO | *None* | Passed test cases count |
| `totalTests` | INT | NO | *None* | Total test cases evaluated |
| `executionTimeMs` | INT | NO | *None* | Runtime execution duration in ms |
| `submittedAt` | VARCHAR(50) | NO | *None* | Submission timestamp |

---

### Table 11: `blogs`
Community technical articles created by trainers and approved by admins.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique blog UUID |
| `title` | VARCHAR(255) | NO | *None* | Article title |
| `content` | TEXT | NO | *None* | Markdown body content |
| `summary` | TEXT | NO | *None* | Excerpt synopsis |
| `coverImage` | TEXT | YES | NULL | Cover image URL |
| `authorId` | VARCHAR(36) | NO | FK -> `users(id)` | Author user ID (CASCADE on delete) |
| `authorName` | VARCHAR(255) | NO | *None* | Author display name |
| `category` | VARCHAR(100) | NO | *None* | Topic category |
| `tags` | JSON | YES | NULL | Array of topic tags |
| `likesCount` | INT | YES | 0 | Total upvotes |
| `bookmarksCount` | INT | YES | 0 | Total saves |
| `status` | ENUM('draft', 'pending', 'approved', 'rejected') | YES | 'pending' | Editorial approval state |
| `createdAt` | VARCHAR(50) | NO | *None* | Creation timestamp |

---

### Table 12: `comments`
Discussion comments underneath blog posts.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique comment UUID |
| `blogId` | VARCHAR(36) | NO | FK -> `blogs(id)` | Target blog ID (CASCADE on delete) |
| `userId` | VARCHAR(36) | NO | FK -> `users(id)` | Commenter user ID (CASCADE on delete) |
| `userName` | VARCHAR(255) | NO | *None* | Cached user display name |
| `userAvatar` | TEXT | YES | NULL | Cached user profile avatar URL |
| `content` | TEXT | NO | *None* | Comment text |
| `createdAt` | VARCHAR(50) | NO | *None* | Creation timestamp |

---

### Table 13: `reviews`
Student ratings and feedback on completed courses.

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | Primary Key | Unique review UUID |
| `courseId` | VARCHAR(36) | NO | FK -> `courses(id)` | Target course ID (CASCADE on delete) |
| `studentId` | VARCHAR(36) | NO | FK -> `users(id)` | Reviewer student ID (CASCADE on delete) |
| `studentName` | VARCHAR(255) | NO | *None* | Cached student name |
| `rating` | INT | NO | *None* | Score (1 to 5) |
| `comment` | TEXT | NO | *None* | Review feedback body |
| `createdAt` | VARCHAR(50) | NO | *None* | Creation timestamp |

*Unique Constraint:* `student_course_review (studentId, courseId)`

---

## 3. Entity Relationships Diagram

```
       +--------------------------------------------------------------+
       |                           users                              |
       +--------------------------------------------------------------+
         | (1:N)          | (1:N)         | (1:N)          | (1:N)
         |                |               |                |
         v                v               v                v
   +-----------+   +-------------+  +-----------+   +-------------+
   |  courses  |   | enrollments |  | progress  |   | submissions |
   +-----------+   +-------------+  +-----------+   +-------------+
     | (1:N)              |               |                |
     v                    +-------+       |                |
   +-----------+                  |       |                |
   |  modules  |                  |       |                |
   +-----------+                  |       |                |
     | (1:N)                      |       |                |
     v                            |       |                |
   +-----------+ <----------------+-------+                |
   |  lessons  |                                           |
   +-----------+                                           |
     |                                                     |
     | (1:N)                                               |
     v                                                     v
   +-------------+                                  +-------------+
   | assessments | -------------------------------> |  questions  |
   +-------------+      (1:N)                       +-------------+

   +-----------+       +-----------+                +-------------+
   |   blogs   | ----> | comments  |                |   reviews   |
   +-----------+ (1:N) +-----------+                +-------------+
         ^                   ^                             ^
         | (authorId)        | (userId)                    | (studentId & courseId)
         +-------------------+-----------------------------+
```

---

## 4. API Endpoints Reference Matrix

### 4.1 Authentication & Profile APIs

#### `POST /api/auth/register`
* **Purpose:** Register a new user account.
* **Auth:** Public.
* **Request Body:** `{ name: string, email: string, password: string, role: "student" | "trainer" }`
* **Response (201):** `{ user: User, token: string }`
* **Tables:** `users` (INSERT).

#### `POST /api/auth/login`
* **Purpose:** Authenticate an existing user with email and password.
* **Auth:** Public.
* **Request Body:** `{ email: string, password: string }`
* **Response (200):** `{ user: User, token: string }`
* **Tables:** `users` (SELECT).

#### `GET /api/auth/me`
* **Purpose:** Retrieve the currently authenticated user profile from token.
* **Auth:** Required (Any active user).
* **Headers:** `Authorization: Bearer <token>`
* **Response (200):** `{ user: User }`
* **Tables:** `users` (SELECT).

#### `PUT /api/student/profile`
* **Purpose:** Update display name, profile photo, or change password.
* **Auth:** Required (Student, Trainer, Admin).
* **Request Body:** `{ name?: string, profilePhoto?: string, currentPassword?: string, newPassword?: string }`
* **Response (200):** `{ message: string, user: User }`
* **Tables:** `users` (SELECT, UPDATE).

---

### 4.2 Student APIs

#### `GET /api/student/dashboard`
* **Purpose:** Retrieve aggregate student metrics (enrolled count, average progress, quiz stats, coding stats, recent activity).
* **Auth:** Required (Student).
* **Response (200):** `{ enrolledCount: number, completedCourses: number, averageProgress: number, passedAssessments: number, codingChallengesSolved: number, recentActivity: Array, courseProgress: Array }`
* **Tables:** `enrollments`, `courses`, `progress`, `submissions`, `coding_submissions`, `lessons`, `assessments`.

#### `GET /api/student/courses`
* **Purpose:** List all courses enrolled by the active student.
* **Auth:** Required (Student).
* **Response (200):** `Course[]`
* **Tables:** `enrollments`, `courses`.

#### `POST /api/student/courses/:courseId/enroll`
* **Purpose:** Enroll the active student in a published course.
* **Auth:** Required (Student).
* **Response (200):** `{ message: string, enrollment: Enrollment }`
* **Tables:** `courses` (SELECT), `enrollments` (INSERT).

#### `POST /api/student/lessons/:lessonId/progress`
* **Purpose:** Mark a lesson as completed or in-progress.
* **Auth:** Required (Student).
* **Request Body:** `{ completed: boolean, timeSpentSeconds?: number }`
* **Response (200):** `{ message: string, progress: Progress }`
* **Tables:** `lessons` (SELECT), `progress` (SELECT, INSERT/UPDATE).

#### `GET /api/student/courses/:courseId/progress`
* **Purpose:** Fetch detailed progress records across all lessons for a specific course.
* **Auth:** Required (Student).
* **Response (200):** `Progress[]`
* **Tables:** `progress` (SELECT).

#### `GET /api/student/bookmarks`
* **Purpose:** Fetch blog posts bookmarked by the active student.
* **Auth:** Required (Student).
* **Response (200):** `Blog[]`
* **Tables:** `users` (SELECT), `blogs` (SELECT).

#### `GET /api/student/assessments`
* **Purpose:** List all assessments with the student's passing status, scores, and attempt counts.
* **Auth:** Required (Student).
* **Response (200):** `Array<{ id, title, courseTitle, passingScore, attemptsCount, score, status, isEnrolled }>`
* **Tables:** `enrollments`, `assessments`, `submissions`, `courses`.

---

### 4.3 Trainer APIs

#### `GET /api/trainer/dashboard`
* **Purpose:** Load trainer KPIs (courses count, students enrolled, assessments, recent courses).
* **Auth:** Required (Trainer, Admin).
* **Response (200):** `{ coursesCount: number, studentsCount: number, assessmentsCount: number, blogsCount: number, recentCourses: Course[] }`
* **Tables:** `courses`, `enrollments`, `assessments`, `blogs`, `users`.

#### `POST /api/trainer/courses`
* **Purpose:** Create a new course entry in draft state.
* **Auth:** Required (Trainer, Admin).
* **Request Body:** `{ title: string, description: string, category: string, skillsCovered: string[], requirements: string[] }`
* **Response (201):** `{ message: string, course: Course }`
* **Tables:** `users` (SELECT), `courses` (INSERT).

#### `PUT /api/trainer/courses/:id`
* **Purpose:** Update course metadata (title, description, category, skills).
* **Auth:** Required (Trainer owning the course, or Admin).
* **Request Body:** `Partial<Course>`
* **Response (200):** `{ message: string, course: Course }`
* **Tables:** `courses` (SELECT, UPDATE).

#### `DELETE /api/trainer/courses/:id`
* **Purpose:** Delete a course and its cascading modules/lessons.
* **Auth:** Required (Trainer owning the course, or Admin).
* **Response (200):** `{ message: string }`
* **Tables:** `courses` (SELECT, DELETE).

#### `POST /api/trainer/courses/:courseId/modules`
* **Purpose:** Add a new module chapter to a course syllabus.
* **Auth:** Required (Trainer owning the course, or Admin).
* **Request Body:** `{ title: string, order: number }`
* **Response (201):** `{ message: string, module: Module }`
* **Tables:** `courses` (SELECT), `modules` (INSERT).

#### `POST /api/trainer/modules/:moduleId/lessons`
* **Purpose:** Add a new video, text, or coding lesson to a module.
* **Auth:** Required (Trainer owning the course, or Admin).
* **Request Body:** `{ title: string, type: LessonType, content?: string, videoUrl?: string, fileUrl?: string, codingPrompt?: object, order: number, durationMinutes: number }`
* **Response (201):** `{ message: string, lesson: Lesson }`
* **Tables:** `modules` (SELECT), `courses` (SELECT), `lessons` (INSERT).

---

### 4.4 Admin APIs

#### `GET /api/admin/dashboard`
* **Purpose:** Load system-wide statistics (student count, trainer count, published courses, assessment submissions).
* **Auth:** Required (Admin).
* **Response (200):** `{ studentsCount: number, trainersCount: number, coursesCount: number, submissionsCount: number, recentActivity: Array }`
* **Tables:** `users`, `courses`, `enrollments`, `submissions`.

#### `GET /api/admin/users`
* **Purpose:** List all platform users with roles and status.
* **Auth:** Required (Admin).
* **Response (200):** `User[]`
* **Tables:** `users` (SELECT).

#### `PUT /api/admin/users/:id/status`
* **Purpose:** Suspend or activate a user account.
* **Auth:** Required (Admin).
* **Request Body:** `{ status: "active" | "suspended" }`
* **Response (200):** `{ message: string, user: User }`
* **Tables:** `users` (UPDATE).

#### `PUT /api/admin/courses/:id/status`
* **Purpose:** Approve, reject, publish, or feature a course.
* **Auth:** Required (Admin).
* **Request Body:** `{ status?: "published" | "draft" | "rejected", isFeatured?: boolean }`
* **Response (200):** `{ message: string, course: Course }`
* **Tables:** `courses` (UPDATE).

---

### 4.5 Courses & Assessments APIs

#### `GET /api/courses`
* **Purpose:** Fetch public course catalog where `status = 'published'`.
* **Auth:** Public.
* **Response (200):** `Course[]`
* **Tables:** `courses` (SELECT).

#### `GET /api/courses/:id`
* **Purpose:** Fetch full course syllabus, modules, lessons, and student reviews.
* **Auth:** Public.
* **Response (200):** `{ course: Course, modules: Module[], lessons: Lesson[], reviews: Review[] }`
* **Tables:** `courses`, `modules`, `lessons`, `reviews`.

#### `POST /api/courses/:id/reviews`
* **Purpose:** Submit a rating and review for a course.
* **Auth:** Required (Student).
* **Request Body:** `{ rating: number, comment: string }`
* **Response (201):** `{ message: string, review: Review }`
* **Tables:** `users` (SELECT), `reviews` (INSERT), `courses` (UPDATE rating/count).

#### `GET /api/assessments/:id`
* **Purpose:** Fetch assessment details and questions (hiding `correctAnswers` for students).
* **Auth:** Required (Student).
* **Response (200):** `{ assessment: Assessment, questions: Question[] }`
* **Tables:** `assessments` (SELECT), `questions` (SELECT).

#### `POST /api/assessments/:id/submit`
* **Purpose:** Grade assessment answers, compute score, evaluate pass threshold, and store submission.
* **Auth:** Required (Student).
* **Request Body:** `{ answers: { [questionId: string]: any }, timeTakenSeconds: number }`
* **Response (200):** `{ message: string, submission: Submission, score: number, passed: boolean }`
* **Tables:** `users` (SELECT), `assessments` (SELECT), `questions` (SELECT), `submissions` (INSERT).

---

### 4.6 Coding Practice & AI Explainer APIs

#### `POST /api/coding/run`
* **Purpose:** Execute JavaScript code in an isolated VM sandbox against problem test cases.
* **Auth:** Required.
* **Request Body:** `{ language: "javascript" | "python", code: string, customInput?: string }`
* **Response (200):** `{ stdout: string, executionTimeMs: number }`
* **Tables:** *None (Memory Sandbox)*.

#### `POST /api/coding/submit`
* **Purpose:** Formally test and submit code against test cases and store performance metrics.
* **Auth:** Required (Student).
* **Request Body:** `{ problemId: string, language: string, code: string, passedTests: number, totalTests: number, executionTimeMs: number }`
* **Response (200):** `{ message: string, submission: CodingSubmission }`
* **Tables:** `users` (SELECT), `coding_submissions` (INSERT).

#### `POST /api/ai/explain`
* **Purpose:** Provide AI-powered code analysis, tutoring, or lesson concept explanations.
* **Auth:** Required.
* **Request Body:** `{ content: string, context?: string }`
* **Response (200):** `{ explanation: string }`
* **Tables:** *None (Gemini 2.5 Flash API with heuristic fallback)*.

---

### 4.7 Blogs & Comments APIs

#### `GET /api/blogs`
* **Purpose:** Fetch public articles where `status = 'approved'`.
* **Auth:** Public.
* **Response (200):** `Blog[]`
* **Tables:** `blogs` (SELECT).

#### `GET /api/blogs/all`
* **Purpose:** Fetch all blog posts including pending and drafts.
* **Auth:** Required (Trainer, Admin).
* **Response (200):** `Blog[]`
* **Tables:** `blogs` (SELECT).

#### `POST /api/blogs`
* **Purpose:** Author and submit a new article for approval.
* **Auth:** Required (Trainer, Admin).
* **Request Body:** `{ title: string, summary: string, content: string, category: string, tags: string[], coverImage?: string }`
* **Response (201):** `{ message: string, blog: Blog }`
* **Tables:** `users` (SELECT), `blogs` (INSERT).

#### `PUT /api/blogs/:id/status`
* **Purpose:** Approve or reject a blog submission.
* **Auth:** Required (Admin).
* **Request Body:** `{ status: "approved" | "rejected" }`
* **Response (200):** `{ message: string, blog: Blog }`
* **Tables:** `blogs` (UPDATE).

#### `POST /api/blogs/:id/like`
* **Purpose:** Increment like count on an article.
* **Auth:** Required.
* **Response (200):** `{ message: string, likesCount: number }`
* **Tables:** `blogs` (UPDATE).

#### `POST /api/blogs/:id/bookmark`
* **Purpose:** Toggle bookmark state of an article for the active user.
* **Auth:** Required.
* **Response (200):** `{ isBookmarked: boolean, bookmarkedBlogIds: string[] }`
* **Tables:** `blogs` (UPDATE count), `users` (UPDATE `bookmarkedBlogIds`).

#### `GET /api/blogs/:id/comments`
* **Purpose:** Retrieve all comments posted on a blog post.
* **Auth:** Public.
* **Response (200):** `Comment[]`
* **Tables:** `comments` (SELECT).

#### `POST /api/blogs/:id/comments`
* **Purpose:** Post a comment on a blog post.
* **Auth:** Required.
* **Request Body:** `{ content: string }`
* **Response (201):** `{ message: string, comment: Comment }`
* **Tables:** `users` (SELECT), `comments` (INSERT).

---

## 5. Security & Authorization Flows

### 5.1 Authentication Flow
```
User (Browser)
   │
   ├─► Enters email & password into Auth Form
   │
   ├─► POST /api/auth/login
   │     │
   │     ├─► Computes SHA-256(password)
   │     ├─► SELECT * FROM users WHERE email = ? AND status != 'suspended'
   │     ├─► Compares passwordHash with database hash
   │     └─► Generates Base64 session token ("userId:role:email")
   │
   ├─► Browser stores token in localStorage ('lms_token')
   │
   ├─► App.tsx validates session via GET /api/auth/me
   │
   └─► Routes user to role-specific dashboard:
         • Student ──► "dashboard" (StudentDashboard)
         • Trainer ──► "trainer-dashboard" (TrainerConsole)
         • Admin   ──► "admin-dashboard" (AdminConsole)
```

### 5.2 Role-Based Authorization Guards
1. **Middleware Authentication (`authenticateToken`):**
   * Decodes session token.
   * Looks up the user directly in the MySQL `users` table.
   * Binds the true database-stored role: `req.user = { id, role: user.role, email }`.
2. **Endpoint Protection:**
   * `/api/trainer/*` $\rightarrow$ Checks `req.user.role === 'trainer' || req.user.role === 'admin'`. Returns `403 Forbidden` if student.
   * `/api/admin/*` $\rightarrow$ Checks `req.user.role === 'admin'`. Returns `403 Forbidden` if student or trainer.
   * Course mutation operations verify that `course.instructorId === req.user.id` or `role === 'admin'`.
3. **Frontend Guarding:**
   * Tab components in [src/App.tsx](file:///D:/malla/office/MRTECHLMS/src/App.tsx) conditionally mount based on `currentUser.role`.

---

## 6. Frontend Component $\rightarrow$ API Endpoint Mapping

| Frontend Component | File Path | API Endpoints Invoked | Purpose |
|---|---|---|---|
| **App** | `src/App.tsx` | `POST /api/auth/login`<br>`POST /api/auth/register`<br>`GET /api/auth/me`<br>`GET /api/courses`<br>`GET /api/student/dashboard`<br>`POST /api/student/courses/:id/enroll`<br>`POST /api/student/lessons/:id/progress` | Global auth, session bootstrap, catalog browsing, course enrollment, lesson progress tracking |
| **Sidebar** | `src/components/Sidebar.tsx` | *None (receives `onLogout` & `setActiveTab`)* | Role-aware navigation drawer |
| **StudentDashboard** | `src/components/StudentDashboard.tsx` | `POST /api/ai/explain` | Displays enrolled course cards, progress gauges, recommended courses, and quick AI mentor widget |
| **CoursePlayer** | `src/components/CoursePlayer.tsx` | `GET /api/courses/:id`<br>`POST /api/courses/:id/reviews`<br>`POST /api/ai/explain` | Video/lesson viewer, curriculum sidebar, course rating/reviewing, AI concept breakdown |
| **AssessmentConsole** | `src/components/AssessmentConsole.tsx` | `GET /api/student/assessments` | Filterable list of student assessments, completion pass rates, exam launching |
| **AssessmentViewer** | `src/components/AssessmentViewer.tsx` | `GET /api/assessments/:id`<br>`POST /api/assessments/:id/submit` | Timed multiple-choice quiz engine, answer submission, instant score feedback |
| **CodingPractice** | `src/components/CodingPractice.tsx` | `POST /api/coding/run`<br>`POST /api/coding/submit` | In-browser code editor, sandbox execution, automated test case evaluation |
| **BlogPortal** | `src/components/BlogPortal.tsx` | `GET /api/blogs`<br>`GET /api/blogs/all`<br>`POST /api/blogs`<br>`POST /api/blogs/:id/like`<br>`POST /api/blogs/:id/bookmark`<br>`GET /api/blogs/:id/comments`<br>`POST /api/blogs/:id/comments` | Community tech articles, comment section, likes, article bookmarking, author submission form |
| **ProfileConsole** | `src/components/ProfileConsole.tsx` | `GET /api/student/bookmarks`<br>`PUT /api/student/profile` | Profile photo preset picker, display name change, password modification, saved bookmarks list |
| **TrainerConsole** | `src/components/TrainerConsole.tsx` | `GET /api/trainer/dashboard`<br>`GET /api/courses/:id`<br>`POST /api/trainer/courses`<br>`PUT /api/trainer/courses/:id`<br>`DELETE /api/trainer/courses/:id`<br>`POST /api/trainer/courses/:id/modules`<br>`POST /api/trainer/modules/:id/lessons` | Trainer course roster, module addition, lesson creation, KPI summary cards |
| **AdminConsole** | `src/components/AdminConsole.tsx` | `GET /api/admin/dashboard`<br>`GET /api/admin/users`<br>`PUT /api/admin/users/:id/status`<br>`GET /api/courses`<br>`PUT /api/admin/courses/:id/status` | System overview, user suspension toggles, course publishing & featuring approval |

---

## 7. Feature Completeness Matrix

| LMS Feature Area | Completeness Status | Current Implementation Notes |
|---|---|---|
| **User Authentication & Session** | **Complete** | MySQL backed, session persistence, automatic role redirection. |
| **Role-Based Access Control (RBAC)** | **Complete** | Double-checked on both frontend tab rendering and backend route middleware. |
| **Course Catalog & Viewing** | **Complete** | MySQL backed (`courses`, `modules`, `lessons`, `reviews`). |
| **Student Enrollment & Progress** | **Complete** | Dynamic tracking via `enrollments` & `progress` tables. |
| **Quiz / Assessment Engine** | **Complete** | Secure question fetching (answers omitted for students), backend scoring, pass/fail evaluation. |
| **Coding Playground Sandbox** | **Partially Complete** | JavaScript execution works via Node VM sandbox. Python execution returns simulated test outputs. |
| **Community Blog Portal** | **Complete** | MySQL backed with likes, comments, authoring, and admin moderation. |
| **User Profile Management** | **Complete** | Name updates, avatar preset selection, password updates, bookmarked articles. |
| **Trainer Course Builder** | **Complete** | Dynamic course creation, module creation, and lesson creation. |
| **Admin User & Course Moderation** | **Complete** | User activation/suspension toggling and course publishing/rejection. |
| **Assignments & File Uploads** | **UI/Template only** | File URL inputs exist, but binary multipart/form-data storage service (e.g. S3 / local uploads) is not yet implemented. |
| **Certificates & Badges** | **Template/Visual only** | Pass rates and awards are computed dynamically in UI, but PDF certificate generation is not yet implemented. |

---

## 8. Frontend vs. Backend Logic Analysis

The following business logic currently executes on the frontend and should eventually be moved to the backend as the LMS scales:

1. **Course Completion Percentage Calculation:**
   * *Current:* [src/App.tsx](file:///D:/malla/office/MRTECHLMS/src/App.tsx) and [src/components/StudentDashboard.tsx](file:///D:/malla/office/MRTECHLMS/src/components/StudentDashboard.tsx) calculate overall average progress and per-course percentages on the client side.
   * *Target:* An aggregated SQL query in `GET /api/student/dashboard` should compute and return the definitive completion percentage.
2. **Assessment Passing Rate Statistics:**
   * *Current:* [src/components/AssessmentConsole.tsx](file:///D:/malla/office/MRTECHLMS/src/components/AssessmentConsole.tsx#L50-L53) filters assessment arrays to compute total attempted, total passed, and overall pass rate percentage.
   * *Target:* The backend endpoint `GET /api/student/assessments` should return these pre-aggregated summary statistics directly.
3. **Assessment Leaderboard Generation:**
   * *Current:* [src/components/AssessmentViewer.tsx](file:///D:/malla/office/MRTECHLMS/src/components/AssessmentViewer.tsx#L106-L111) creates a client-side simulated leaderboard after quiz submission.
   * *Target:* A dedicated endpoint `GET /api/assessments/:id/leaderboard` querying the `submissions` table sorted by `score DESC, timeTakenSeconds ASC`.

---

## 9. Catalog of Remaining Mock / Static Data

1. **Quick-Sign-In Buttons ([src/App.tsx](file:///D:/malla/office/MRTECHLMS/src/App.tsx#L332-L352)):** Demo credential helper buttons on the login card (`student@lms.com`, `trainer@lms.com`, `admin@lms.com`).
2. **Simulated Assessment Leaderboard ([src/components/AssessmentViewer.tsx](file:///D:/malla/office/MRTECHLMS/src/components/AssessmentViewer.tsx#L106-L111)):** Mock peers (`"Sarah Connor"`, `"Michael Scott"`) displayed after submitting a quiz.
3. **Coding Sandbox Initial Problem ([src/components/CodingPractice.tsx](file:///D:/malla/office/MRTECHLMS/src/components/CodingPractice.tsx#L38-L59)):** Initial default problem definition (`"Check If Prime Number"`).
4. **Profile Avatar Presets ([src/components/ProfileConsole.tsx](file:///D:/malla/office/MRTECHLMS/src/components/ProfileConsole.tsx#L20-L30)):** An array of 6 stock Unsplash URLs for profile avatar selection.

---

## 10. Database Scalability & Relationship Analysis

The following design enhancements will prevent performance bottlenecks as the LMS grows:

1. **Missing Composite Index on Progress & Enrollments:**
   * Currently, `SELECT * FROM progress WHERE studentId = ? AND courseId = ?` scans the table.
   * *Recommendation:* Add composite index `idx_progress_student_course (studentId, courseId)`.
2. **JSON Columns vs. Dedicated Normalized Tables:**
   * `courses.skillsCovered` and `courses.requirements` use JSON columns. For advanced tag searching, a normalized `course_tags` or `course_skills` table will improve searchability.
   * `users.bookmarkedBlogIds` is stored as JSON array in `users`. A normalized `blog_bookmarks (userId, blogId)` table with a foreign key constraint will prevent orphaned bookmarks when a blog is deleted.
3. **Date/Time Columns:**
   * Timestamps (`createdAt`, `enrolledAt`, `submittedAt`) are currently stored as `VARCHAR(50)`.
   * *Recommendation:* Migrate to native `DATETIME(3)` or `TIMESTAMP` for index efficiency, date-range filtering, and time-zone conversions.
4. **Password Hashing:**
   * Currently uses SHA-256 without salt/work-factor.
   * *Recommendation:* Migrate to `bcrypt` (work factor 10) with automatic transparent upgrade on login.
