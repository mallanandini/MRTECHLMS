# MRTECHLMS Database Schema Reference

---

## 1. Overview

The MRTECHLMS database runs on MySQL 8.0+ using the `InnoDB` storage engine and `utf8mb4` character set. The database consists of 27 tables organized into 8 functional domains:
1. Multi-Tenancy & Organizations (`organizations`)
2. Users & Preferences (`users`, `user_preferences`)
3. Courses & Curriculum (`courses`, `modules`, `lessons`, `enrollments`, `progress`, `reviews`)
4. Assessments & Grading (`assessments`, `questions`, `assessment_assignments`, `submissions`)
5. Modular Learning Paths (`learning_paths`, `learning_path_sections`, `learning_path_items`, `learning_path_assignments`, `learning_path_progress`)
6. Interactive Coding & Playground (`coding_challenges`, `coding_chapters`, `coding_topics`, `coding_saved_code`, `coding_submissions`, `student_playground_programs`)
7. Community & Blogs (`blogs`, `comments`)
8. Compliance & Observability (`audit_logs`, `schema_migrations`)

---

## 2. Table Specifications

### 2.1 Multi-Tenancy & Organizations

#### `organizations`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | NULL | Unique tenant UUID |
| `name` | VARCHAR(255) | NO | | NULL | Institution / College full name |
| `slug` | VARCHAR(100) | NO | UNI | NULL | Unique URL slug identifier |
| `domain` | VARCHAR(255) | YES | | NULL | Custom domain / subdomain mapping |
| `logoUrl` | TEXT | YES | | NULL | URL to organization brand logo |
| `settings` | JSON | YES | | NULL | Tenant configuration JSON |
| `status` | ENUM('active','inactive','suspended') | YES | | 'active' | Operational state |
| `createdAt` | VARCHAR(50) | NO | | NULL | Creation ISO timestamp |
| `updatedAt` | VARCHAR(50) | YES | | NULL | Last modification ISO timestamp |
| `deletedAt` | VARCHAR(50) | YES | | NULL | Soft delete ISO timestamp |

**Indexes**: `PRIMARY (id)`, `idx_org_slug (slug)`, `idx_org_status (status)`

---

### 2.2 Users & Preferences

#### `users`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | NULL | User UUID |
| `organizationId` | VARCHAR(36) | YES | MUL | 'org-default' | Tenant UUID |
| `name` | VARCHAR(255) | NO | | NULL | Full display name |
| `email` | VARCHAR(255) | NO | UNI | NULL | Unique login email address |
| `role` | ENUM('student','trainer','admin','super_admin','manager') | NO | | 'student' | RBAC role |
| `profilePhoto` | TEXT | YES | | NULL | Avatar image URL |
| `status` | ENUM('active','suspended') | YES | | 'active' | Account state |
| `bookmarkedBlogIds` | JSON | YES | | NULL | Array of bookmarked blog IDs |
| `passwordHash` | VARCHAR(255) | NO | | NULL | Bcrypt hash |
| `createdAt` | VARCHAR(50) | NO | | NULL | Account creation ISO timestamp |
| `updatedAt` | VARCHAR(50) | YES | | NULL | Profile update timestamp |
| `deletedAt` | VARCHAR(50) | YES | | NULL | Soft delete ISO timestamp |

**Indexes**: `PRIMARY (id)`, `email (email UNIQUE)`, `idx_users_org (organizationId)`, `idx_users_deleted (deletedAt)`, `idx_users_org_role_status (organizationId, role, status)`

#### `user_preferences`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | NULL | UUID |
| `userId` | VARCHAR(36) | NO | UNI | NULL | User reference |
| `theme` | VARCHAR(50) | NO | | 'default-blue' | UI color scheme |
| `mode` | ENUM('light','dark') | NO | | 'light' | Theme mode |
| `primaryColor` | VARCHAR(50) | NO | | '#2563eb' | Primary brand hex |
| `secondaryColor` | VARCHAR(50) | NO | | '#4f46e5' | Secondary brand hex |
| `backgroundColor` | VARCHAR(50) | NO | | '#f8fafc' | App background hex |
| `surfaceColor` | VARCHAR(50) | NO | | '#ffffff' | Card surface hex |
| `textColor` | VARCHAR(50) | NO | | '#0f172a' | Typography hex |
| `createdAt` | VARCHAR(50) | NO | | NULL | Creation timestamp |
| `updatedAt` | VARCHAR(50) | YES | | NULL | Update timestamp |

---

### 2.3 Courses & Curriculum

#### `courses`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | NULL | Course UUID |
| `organizationId` | VARCHAR(36) | YES | MUL | 'org-default' | Tenant UUID |
| `title` | VARCHAR(255) | NO | | NULL | Course title |
| `shortDescription` | TEXT | YES | | NULL | Course overview summary |
| `description` | TEXT | NO | | NULL | Full description |
| `difficulty` | VARCHAR(50) | YES | | NULL | Difficulty label |
| `thumbnail` | TEXT | YES | | NULL | Cover image URL |
| `banner` | TEXT | YES | | NULL | Header banner URL |
| `instructorId` | VARCHAR(36) | NO | MUL | NULL | Instructor user ID |
| `instructorName` | VARCHAR(255) | NO | | NULL | Instructor display name |
| `category` | VARCHAR(100) | NO | | NULL | Subject category |
| `requirements` | JSON | YES | | NULL | Array of prerequisite strings |
| `skillsCovered` | JSON | YES | | NULL | Array of skill strings |
| `status` | ENUM('draft','published','rejected','archived') | YES | | 'draft' | Lifecycle status |
| `isFeatured` | TINYINT(1) | YES | | 0 | Featured course flag |
| `rating` | DECIMAL(3,2) | YES | | 0.00 | Average rating |
| `reviewsCount` | INT | YES | | 0 | Review count |
| `createdAt` | VARCHAR(50) | NO | | NULL | Creation timestamp |
| `updatedAt` | VARCHAR(50) | YES | | NULL | Last modification timestamp |
| `deletedAt` | VARCHAR(50) | YES | | NULL | Soft delete ISO timestamp |

**Indexes**: `PRIMARY (id)`, `instructorId (instructorId)`, `idx_courses_org (organizationId)`, `idx_courses_deleted (deletedAt)`, `idx_courses_org_status (organizationId, status)`

#### `modules`
| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | Module UUID |
| `courseId` | VARCHAR(36) | NO | MUL | Foreign Key -> `courses(id)` (ON DELETE CASCADE) |
| `title` | VARCHAR(255) | NO | | Module title |
| `order` | INT | NO | | Ordering index within course |
| `description` | TEXT | YES | | Module overview |

#### `lessons`
| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | Lesson UUID |
| `moduleId` | VARCHAR(36) | NO | MUL | Foreign Key -> `modules(id)` (ON DELETE CASCADE) |
| `courseId` | VARCHAR(36) | NO | MUL | Foreign Key -> `courses(id)` (ON DELETE CASCADE) |
| `title` | VARCHAR(255) | NO | | Lesson title |
| `type` | ENUM('video','pdf','image','text','coding') | NO | | Content delivery format |
| `content` | TEXT | YES | | Rich text / markdown content |
| `videoUrl` | TEXT | YES | | Video asset / stream URL |
| `fileUrl` | TEXT | YES | | Supplementary document URL |
| `codingPrompt` | JSON | YES | | Interactive coding challenge data |
| `order` | INT | NO | | Lesson sequence order |
| `durationMinutes` | INT | YES | | Estimated completion time |

#### `enrollments`
| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | Enrollment UUID |
| `organizationId` | VARCHAR(36) | YES | MUL | Tenant UUID |
| `studentId` | VARCHAR(36) | NO | MUL | Foreign Key -> `users(id)` (ON DELETE CASCADE) |
| `courseId` | VARCHAR(36) | NO | MUL | Foreign Key -> `courses(id)` (ON DELETE CASCADE) |
| `enrolledAt` | VARCHAR(50) | NO | | Enrollment timestamp |
| `completedAt` | VARCHAR(50) | YES | | Completion timestamp |

**Indexes**: `PRIMARY (id)`, `student_course_uniq (studentId, courseId UNIQUE)`

---

### 2.4 Assessments & Submissions

#### `assessments`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | NULL | Assessment UUID |
| `organizationId` | VARCHAR(36) | YES | MUL | 'org-default' | Tenant UUID |
| `courseId` | VARCHAR(36) | YES | MUL | NULL | Associated course (nullable for standalone) |
| `moduleId` | VARCHAR(36) | YES | MUL | NULL | Associated module |
| `lessonId` | VARCHAR(36) | YES | | NULL | Associated lesson |
| `learningPathId` | VARCHAR(36) | YES | | NULL | Associated learning path |
| `type` | ENUM(...) | YES | | 'course_final' | Assessment category |
| `title` | VARCHAR(255) | NO | | NULL | Title |
| `description` | TEXT | NO | | NULL | Overview |
| `shortDescription` | TEXT | YES | | NULL | Brief card description |
| `instructions` | TEXT | YES | | NULL | Student test guidelines |
| `durationMinutes` | INT | NO | | NULL | Total allowed time |
| `passingScore` | INT | NO | | NULL | Minimum passing points |
| `totalPoints` | INT | NO | | NULL | Maximum points |
| `questionsCount` | INT | NO | | NULL | Total questions |
| `maxAttempts` | INT | YES | | 1 | Maximum attempts |
| `questionNavigation` | ENUM('free','sequential') | YES | | 'free' | Navigation constraint |
| `randomizeQuestions` | TINYINT(1) | YES | | 0 | Shuffle questions |
| `randomizeOptions` | TINYINT(1) | YES | | 0 | Shuffle answer choices |
| `revealAnswers` | TINYINT(1) | YES | | 0 | Show solutions upon completion |
| `status` | ENUM('published','draft','archived') | YES | | 'draft' | Lifecycle state |
| `createdAt` | VARCHAR(50) | NO | | NULL | Creation timestamp |
| `updatedAt` | VARCHAR(50) | YES | | NULL | Update timestamp |
| `deletedAt` | VARCHAR(50) | YES | | NULL | Soft delete ISO timestamp |

**Indexes**: `PRIMARY (id)`, `idx_assessments_org (organizationId)`, `idx_assessments_deleted (deletedAt)`, `idx_assessments_org_status (organizationId, status)`

#### `questions`
| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | Question UUID |
| `assessmentId` | VARCHAR(36) | NO | MUL | Foreign Key -> `assessments(id)` (ON DELETE CASCADE) |
| `type` | ENUM('mcq_single','mcq_multi','true_false','fill_blanks','subjective') | NO | | Question format |
| `questionText` | TEXT | NO | | Question prompt text |
| `options` | JSON | YES | | Array of choices (MCQ) |
| `correctAnswers` | JSON | NO | | Array of correct answer keys / values |
| `points` | INT | NO | | Points awarded on correct answer |
| `negativePoints` | INT | YES | | Penalty for incorrect answer |
| `explanation` | TEXT | YES | | Solution explanation |
| `difficulty` | VARCHAR(50) | YES | | 'easy', 'medium', 'hard' |
| `order` | INT | NO | | Question sequence order |
| `deletedAt` | VARCHAR(50) | YES | | Soft delete ISO timestamp |

#### `assessment_assignments`
| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | Assignment UUID |
| `organizationId` | VARCHAR(36) | YES | MUL | Tenant UUID |
| `assessmentId` | VARCHAR(36) | NO | MUL | Foreign Key -> `assessments(id)` |
| `studentId` | VARCHAR(36) | NO | MUL | Foreign Key -> `users(id)` |
| `assignedBy` | VARCHAR(36) | NO | MUL | Admin user ID |
| `assignedAt` | VARCHAR(50) | NO | | Assignment timestamp |
| `dueDate` | VARCHAR(50) | YES | | Due date |
| `status` | ENUM('assigned','in_progress','completed') | YES | | Attempt state |
| `createdAt` | VARCHAR(50) | NO | | Record creation timestamp |
| `updatedAt` | VARCHAR(50) | YES | | Record update timestamp |

**Indexes**: `PRIMARY (id)`, `student_assessment_uniq (assessmentId, studentId UNIQUE)`, `idx_assign_student_status (studentId, status)`

#### `submissions`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | PRI | NULL | Submission UUID |
| `organizationId` | VARCHAR(36) | YES | MUL | 'org-default' | Tenant UUID |
| `assessmentId` | VARCHAR(36) | NO | MUL | NULL | Foreign Key -> `assessments(id)` |
| `studentId` | VARCHAR(36) | NO | MUL | NULL | Foreign Key -> `users(id)` |
| `studentName` | VARCHAR(255) | NO | | NULL | Student display name snapshot |
| `answers` | JSON | NO | | NULL | Student answers map `{ questionId: [selected] }` |
| `score` | INT | NO | | NULL | Total scored points |
| `totalPoints` | INT | NO | | NULL | Total possible points |
| `passed` | TINYINT(1) | NO | | NULL | Pass/fail boolean |
| `percentage` | DECIMAL(5,2) | NO | | 0.00 | Score percentage |
| `correctCount` | INT | NO | | 0 | Correct answers count |
| `incorrectCount` | INT | NO | | 0 | Incorrect answers count |
| `unansweredCount` | INT | NO | | 0 | Skipped questions count |
| `timeTakenSeconds` | INT | NO | | 0 | Test duration in seconds |
| `submittedAt` | VARCHAR(50) | NO | | NULL | Submission timestamp |

**Indexes**: `PRIMARY (id)`, `idx_submissions_student_assessment (studentId, assessmentId)`, `idx_submissions_assessment_date (assessmentId, submittedAt)`

---

### 2.5 Compliance & Observability

#### `audit_logs`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(64) | NO | PRI | NULL | Audit record ID |
| `organizationId` | VARCHAR(36) | YES | MUL | 'org-default' | Tenant UUID |
| `userId` | VARCHAR(64) | YES | MUL | NULL | Actor user ID |
| `userEmail` | VARCHAR(255) | YES | | NULL | Actor email |
| `userRole` | VARCHAR(32) | YES | | NULL | Actor role |
| `action` | VARCHAR(64) | NO | MUL | NULL | Action code (e.g. `user_login`, `upload_file`) |
| `resourceType` | VARCHAR(64) | NO | | NULL | Target resource type |
| `resourceId` | VARCHAR(64) | YES | | NULL | Target resource identifier |
| `details` | JSON | YES | | NULL | Contextual event details |
| `ipAddress` | VARCHAR(64) | YES | | NULL | Client IP address |
| `userAgent` | VARCHAR(255) | YES | | NULL | Client user agent string |
| `status` | VARCHAR(16) | NO | | 'success' | Result state (`success` or `failure`) |
| `createdAt` | VARCHAR(32) | NO | MUL | NULL | Event timestamp |

**Indexes**: `PRIMARY (id)`, `idx_audit_user (userId)`, `idx_audit_action (action)`, `idx_audit_created (createdAt)`, `idx_audit_org_action (organizationId, action)`

#### `schema_migrations`
| Column | Type | Nullable | Key | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INT AUTO_INCREMENT | NO | PRI | NULL | Sequence identifier |
| `version` | VARCHAR(100) | NO | UNI | NULL | Migration key (e.g. `001_initial_baseline`) |
| `name` | VARCHAR(255) | NO | | NULL | Migration description |
| `batch` | INT | NO | | NULL | Execution batch group |
| `appliedAt` | TIMESTAMP | NO | | CURRENT_TIMESTAMP | Execution timestamp |

**Indexes**: `PRIMARY (id)`, `version (version UNIQUE)`
