# MRTECHLMS API Architecture Specification

---

## 1. Architectural Standards

All MRTECHLMS backend APIs adhere to RESTful principles over HTTP/JSON with defensive security middleware.

### 1.1 Transport & Headers
- **Content-Type**: `application/json; charset=utf-8`
- **Authentication**: `Authorization: Bearer <signed_jwt>`
- **Tenant Context**: `X-Tenant-ID: <org_id_or_slug>` (Defaults to user's assigned organization or `org-default`)
- **Rate Limit Headers**: `Retry-After: <seconds>` (returned on `429 Too Many Requests`)

---

## 2. Standardized Response Contracts

### 2.1 Standard Success Response
```json
{
  "success": true,
  "data": {
    "id": "usr-123",
    "name": "Alex Student",
    "role": "student"
  }
}
```

### 2.2 Standard Paginated Response
```json
{
  "success": true,
  "data": [
    { "id": "course-1", "title": "Full Stack React" },
    { "id": "course-2", "title": "Data Structures & Algorithms" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2.3 Standard Error Response
```json
{
  "success": false,
  "error": "Password does not meet complexity requirements",
  "code": "VALIDATION_FAILED",
  "details": [
    "password: Must contain at least one uppercase letter and one special symbol"
  ]
}
```

---

## 3. Rate Limiting Envelopes

| Limiter | Scope | Window | Max Requests | Key Generator |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `POST /api/auth/login` | 15 mins | 10 | Client IP (`X-Forwarded-For` or socket) |
| **Code Playground** | `POST /api/playground/run` | 5 mins | 30 | User ID or Client IP |
| **Asset Upload** | `POST /api/upload` | 15 mins | 30 | Admin User ID |
| **AI Explanation** | `POST /api/ai/explain` | 10 mins | 20 | User ID or Client IP |

---

## 4. API Endpoint Directory

### 4.1 Authentication & Session
- `POST /api/auth/login`: Authenticate email/password, returns signed JWT.
- `GET /api/auth/me`: Validate token and fetch currently authenticated user.
- `POST /api/auth/logout`: Invalidate session and emit audit log.
- `POST /api/auth/register`: Disabled (403 Forbidden).
- `POST /api/auth/admin-register`: Disabled (403 Forbidden).

### 4.2 Multi-Tenancy & Organizations
- `GET /api/tenants`: List active organizations (`SUPER_ADMIN` views all, `ADMIN` views self).
- `GET /api/tenants/:id`: View organization details and settings.
- `POST /api/tenants`: Provision new college/organization tenant (`SUPER_ADMIN` only).
- `PUT /api/tenants/:id`: Update organization attributes or branding.
- `DELETE /api/tenants/:id`: Soft-delete organization tenant (`SUPER_ADMIN` only).

### 4.3 Student Learning & Coursework
- `GET /api/student/dashboard`: Metric overview of enrolled courses, completions, and assessments.
- `GET /api/student/courses`: Enrolled course catalog for authenticated student.
- `GET /api/student/courses/:id`: Complete course curriculum (modules, lessons, materials).
- `POST /api/student/courses/:id/enroll`: Enroll student in specified course.
- `POST /api/student/progress`: Record lesson completion and time spent.
- `GET /api/student/progress/:courseId`: Retrieve completion status across course lessons.

### 4.4 Assessments & Grading
- `GET /api/student/assessments`: View all assigned and course-linked assessments.
- `GET /api/student/assessments/:id`: Fetch assessment instructions and details.
- `POST /api/student/assessments/:id/submit`: Autograde and submit student answers.
- `GET /api/student/submissions/:id`: View verified scorecard and answer breakdown.
- `GET /api/assessments/:id/leaderboard`: Authenticated assessment rank leaderboard.

### 4.5 Modular Learning Paths
- `GET /api/student/learning-paths`: View available and assigned learning paths.
- `GET /api/student/learning-paths/:id`: Hierarchical path overview (sections, items, milestones).
- `POST /api/student/learning-paths/:id/progress`: Record path step completion.

### 4.6 Interactive Coding & Playground
- `GET /api/coding/challenges`: Coding challenge library with difficulty filters.
- `GET /api/coding/challenges/:id`: Detailed problem description, examples, starter code.
- `POST /api/coding/challenges/:id/submit`: Autograde coding solution against hidden test cases.
- `POST /api/playground/run`: Authenticated multi-language code execution.
- `GET /api/playground/programs`: Saved student playground scripts.
- `POST /api/playground/programs`: Save or update playground script.

### 4.7 Administrative Management (`/api/admin/*`)
- `GET /api/admin/stats`: Institution-wide operational metrics (students, courses, submissions).
- `GET /api/admin/users`: Manage student and instructor accounts.
- `POST /api/admin/users`: Provision user with strong password validation.
- `PUT /api/admin/users/:id/status`: Suspend or activate user (with self-suspension guard).
- `GET /api/admin/courses`: Authoring studio course list.
- `POST /api/admin/courses`: Create course draft.
- `GET /api/admin/assessments`: Assessment builder list with status filters.
- `POST /api/admin/assessments`: Create assessment with questions, timer, passing score.
- `POST /api/admin/assessments/:id/publish`: Publish assessment for student access.
- `POST /api/admin/assessments/:id/archive`: Archive assessment.
- `POST /api/admin/assessments/:id/assign`: Assign assessment to selected students or batches.
- `GET /api/admin/assessments/:id/results`: Aggregated submission metrics and exportable roster.
