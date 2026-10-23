# MRTECHLMS Academic Batch Management System
## Architectural & Technical Documentation

---

## 1. Executive Architecture & Hierarchy

The MRTECHLMS Batch Management System provides a structured, multi-tier organizational model for managing cohorts, academic cycles, multi-course curricula, and student cohorts across institutions.

### 1.1 Hierarchical Tree Structure

```text
Institution (e.g. MR TECHNOLOGIES)
 └── Batch Year (e.g. 2026, 2027)
      └── Batch (e.g. Python Batch A, Full Stack Batch B)
           ├── Students (Multi-batch memberships)
           └── Courses (Curriculum granted to all batch members)
```

#### Real-World Example:
```text
MR TECHNOLOGIES (MRTECH-MAIN)
 ├── 2026
 │    ├── Python Batch A
 │    │    ├── Students: John Doe, Alice Smith, Bob Patel
 │    │    └── Courses: Python Fundamentals, Data Structures in Python
 │    │
 │    └── Full Stack Batch B
 │         ├── Students: Alice Smith, Charlie Brown
 │         └── Courses: React Modern Web Apps, Node.js Microservices
 │
 └── 2027
      └── SQL Batch
           ├── Students: John Doe, David Lee
           └── Courses: Advanced SQL & Query Optimization
```

### 1.2 Core Cardinality & Student Rules

1. **One Student $\leftrightarrow$ Multiple Batches**:
   A student can be concurrently enrolled in multiple batches across same or different academic years (e.g., Alice Smith belongs simultaneously to `Python Batch A` and `Full Stack Batch B`).
2. **One Batch $\leftrightarrow$ Multiple Students**:
   A batch groups any number of students into a single cohort.
3. **One Batch $\leftrightarrow$ Multiple Courses**:
   A batch can have multiple assigned courses. Adding a course to a batch automatically provisions access for all active students enrolled in that batch.
4. **Multi-Source Course Access Preservation**:
   Course authorization is non-destructive and source-aware:
   - If a student belongs to both **Batch A** and **Batch B**, and both assign **Course X**, removing the student from Batch A **retains access** through Batch B.
   - If a student also possesses a **direct individual enrollment grant** for Course X, removing them from all batches **still preserves** their individual course grant.
   - Access is only revoked when **zero active authorization sources** remain.

---

## 2. Database Schema

The batch management system is backed by high-performance MySQL relational tables with foreign key constraints, composite unique indexes, and audit logging.

### 2.1 Schema ER Diagram

```text
+-------------------+        +--------------------+        +---------------------+
|   institutions    | 1    * |      batches       | 1    * |   batch_students    |
|-------------------|------->|--------------------|<-------|---------------------|
| id (PK)           |        | id (PK)            |        | id (PK)             |
| name              |        | organizationId     |        | batchId (FK)        |
| code (UNIQUE)     |        | institutionId (FK) |        | studentId (FK)      |
| academicYears     |        | name               |        | enrolledAt          |
| status            |        | code (UNIQUE/inst) |        | status ('active')   |
+-------------------+        | academicYear       |        +---------------------+
                             | description        |
                             | status             |
                             +--------------------+
                                      | 1
                                      |
                                      | *
                             +--------------------+        +---------------------+
                             |   batch_courses    | *    1 |       courses       |
                             |--------------------|------->|---------------------|
                             | id (PK)            |        | id (PK)             |
                             | batchId (FK)       |        | title               |
                             | courseId (FK)      |        | difficulty          |
                             | assignedAt         |        | category            |
                             | status ('active')  |        | thumbnail           |
                             +--------------------+        +---------------------+
```

### 2.2 Table Definitions

#### `batches`
Stores individual cohort definitions linked to an institution and academic year.
```sql
CREATE TABLE IF NOT EXISTS batches (
  id VARCHAR(36) PRIMARY KEY,
  organizationId VARCHAR(36) DEFAULT 'org-default',
  institutionId VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  academicYear VARCHAR(50) NOT NULL,
  courseId VARCHAR(36) NULL,
  startDate VARCHAR(50) NULL,
  endDate VARCHAR(50) NULL,
  maxStudents INT NULL,
  description TEXT NULL,
  status ENUM('active', 'upcoming', 'completed', 'archived') DEFAULT 'active',
  createdAt VARCHAR(50) NOT NULL,
  updatedAt VARCHAR(50) NOT NULL,
  deletedAt VARCHAR(50) NULL,
  INDEX idx_batches_org (organizationId),
  INDEX idx_batches_institution (institutionId),
  INDEX idx_batches_academic_year (academicYear),
  INDEX idx_batches_status (status),
  INDEX idx_batches_deleted (deletedAt),
  UNIQUE KEY uk_batches_inst_code (institutionId, code)
);
```

#### `batch_students`
Represents student enrollment in batches. Composite uniqueness `(batchId, studentId)` allows one student to exist across multiple batches.
```sql
CREATE TABLE IF NOT EXISTS batch_students (
  id VARCHAR(36) PRIMARY KEY,
  organizationId VARCHAR(36) DEFAULT 'org-default',
  batchId VARCHAR(36) NOT NULL,
  studentId VARCHAR(36) NOT NULL,
  enrolledAt VARCHAR(50) NOT NULL,
  enrolledBy VARCHAR(36) NOT NULL,
  status ENUM('active', 'inactive', 'transferred', 'dropped') DEFAULT 'active',
  notes TEXT NULL,
  INDEX idx_batch_students_batch (batchId),
  INDEX idx_batch_students_student (studentId),
  INDEX idx_batch_students_status (status),
  UNIQUE KEY uk_batch_student (batchId, studentId)
);
```

#### `batch_courses`
Represents courses linked to batches. Composite uniqueness `(batchId, courseId)` allows one batch to assign multiple courses.
```sql
CREATE TABLE IF NOT EXISTS batch_courses (
  id VARCHAR(36) PRIMARY KEY,
  organizationId VARCHAR(36) DEFAULT 'org-default',
  batchId VARCHAR(36) NOT NULL,
  courseId VARCHAR(36) NOT NULL,
  assignedAt VARCHAR(50) NOT NULL,
  assignedBy VARCHAR(36) NOT NULL,
  status ENUM('active', 'archived') DEFAULT 'active',
  INDEX idx_batch_courses_batch (batchId),
  INDEX idx_batch_courses_course (courseId),
  INDEX idx_batch_courses_status (status),
  UNIQUE KEY uk_batch_course (batchId, courseId)
);
```

---

## 3. Excel Bulk Import Specification

Administrators can bulk upload batches using a standard Microsoft Excel spreadsheet (`.xlsx`).

### 3.1 Four-Column Format

The Excel sheet must provide exactly these 4 column headers on the first sheet:

| Column Header | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `batch_name` | String | Yes | Human-readable name of the batch | `Python Batch A` |
| `institution` | String | Yes | Institution Name or Code | `MR TECHNOLOGIES` or `MRTECH-MAIN` |
| `year` | String | Yes | Academic Year | `2026` or `2026-2027` |
| `description` | String | No | Description / cohort goals | `Core backend and data structures` |

### 3.2 Institution Resolution Engine
The system resolves the `institution` column using a resilient 3-tier lookup:
1. Exact match by `institutions.id`.
2. Exact case-insensitive match by `institutions.code` (e.g. `MRTECH-MAIN`).
3. Substring/fuzzy case-insensitive match by `institutions.name` (e.g. `"MR TECHNOLOGIES"` resolves automatically to `"MR Technologies Academy"`).

### 3.3 Automatic Batch Code Generation
If a batch code is not supplied, the engine automatically formats an institution-scoped, URL-friendly slug:
- Pattern: `{SLUG(batch_name)}-{year}`
- Example: `"Python Batch A"` + `"2026"` $\rightarrow$ `PYTHON-BATCH-A-2026`
- **Collision Resolution**: If `PYTHON-BATCH-A-2026` already exists in that institution, the system appends incremental suffixes (`-1`, `-2`, etc.) safely.

---

## 4. API Endpoints Reference

All batch APIs are mounted under `/api/batches` with backward-compatible aliases under `/api/admin/batches`. Authentication requires a Bearer JWT token in the `Authorization` header.

### 4.1 `GET /api/batches`
Fetches a list of batches with search, filters, pagination, and the embedded academic hierarchy tree.

#### Query Parameters:
- `institutionId` *(optional)*: Filter by institution UUID.
- `academicYear` or `year` *(optional)*: Filter by academic year (e.g. `2026`).
- `status` *(optional)*: `active`, `upcoming`, `completed`, `archived`.
- `search` *(optional)*: Case-insensitive search on batch name or batch code.
- `hierarchy` *(optional, boolean)*: When set to `"true"`, returns only the hierarchy tree.
- `limit`, `offset` *(optional)*: Standard pagination parameters.

#### Response Example:
```json
{
  "batches": [
    {
      "id": "batch-1791448621800-6f4b700d",
      "organizationId": "org-default",
      "institutionId": "inst-mrtech-main",
      "name": "Python Batch A",
      "code": "PYTHON-BATCH-A-2026",
      "academicYear": "2026",
      "description": "Core backend and data structures",
      "status": "active",
      "institutionName": "MR Technologies Academy",
      "institutionCode": "MRTECH-MAIN",
      "studentCount": 24,
      "courseCount": 2,
      "assessmentCount": 1
    }
  ],
  "total": 1,
  "hierarchy": [
    {
      "id": "inst-mrtech-main",
      "name": "MR Technologies Academy",
      "code": "MRTECH-MAIN",
      "totalBatches": 1,
      "years": [
        {
          "year": "2026",
          "batchesCount": 1,
          "totalStudentsCount": 24,
          "totalCoursesCount": 2,
          "batches": [...]
        }
      ]
    }
  ]
}
```

---

### 4.2 `GET /api/batches/hierarchy`
Dedicated endpoint returning the complete Academic Tree Hierarchy (`Institution → Year → Batch → Students & Courses`).

#### Response Example:
```json
{
  "success": true,
  "hierarchy": [
    {
      "id": "inst-mrtech-main",
      "name": "MR Technologies Academy",
      "code": "MRTECH-MAIN",
      "totalBatches": 3,
      "years": [
        {
          "year": "2026",
          "batchesCount": 2,
          "totalStudentsCount": 42,
          "totalCoursesCount": 3,
          "batches": [
            {
              "id": "batch-01",
              "name": "Python Batch A",
              "code": "PYTHON-BATCH-A-2026",
              "academicYear": "2026",
              "studentCount": 24,
              "courseCount": 2,
              "students": [
                { "id": "u-1", "name": "Alice Smith", "email": "alice@gmail.com" }
              ],
              "courses": [
                { "id": "c-1", "title": "Python 101", "category": "Programming" }
              ]
            }
          ]
        },
        {
          "year": "2027",
          "batchesCount": 1,
          "totalStudentsCount": 18,
          "totalCoursesCount": 1,
          "batches": [...]
        }
      ]
    }
  ]
}
```

---

### 4.3 `POST /api/batches`
Creates a new batch. Automatically resolves the institution if a name or code is passed.

#### Request Body:
```json
{
  "batch_name": "Full Stack Batch B",
  "institution": "MR TECHNOLOGIES",
  "year": "2026",
  "description": "MERN Stack Development",
  "capacity": 50,
  "mode": "hybrid",
  "courseIds": ["c-uuid-1", "c-uuid-2"],
  "studentIds": ["s-uuid-1", "s-uuid-2"]
}
```

#### Response Example (`201 Created`):
```json
{
  "id": "batch-1791448621800-6f4b700d",
  "organizationId": "org-default",
  "institutionId": "inst-mrtech-main",
  "name": "Full Stack Batch B",
  "code": "FULL-STACK-BATCH-B-2026",
  "academicYear": "2026",
  "description": "MERN Stack Development",
  "status": "active",
  "institutionName": "MR Technologies Academy",
  "institutionCode": "MRTECH-MAIN",
  "studentCount": 2,
  "courseCount": 2,
  "assessmentCount": 0
}
```

---

### 4.4 `POST /api/batches/import`
Uploads batches in bulk via an Excel spreadsheet (`.xlsx`) or via JSON payload adhering to the standard 4-column format.

#### Multipart Form Upload:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field: `file` (Excel binary `.xlsx`)

#### JSON Alternative:
```json
{
  "batches": [
    {
      "batch_name": "Python Batch A",
      "institution": "MR TECHNOLOGIES",
      "year": "2026",
      "description": "Core Python training"
    },
    {
      "batch_name": "SQL Batch",
      "institution": "MRTECH-MAIN",
      "year": "2027",
      "description": "Database management and optimization"
    }
  ]
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "importedCount": 2,
  "batches": [
    {
      "id": "batch-101",
      "name": "Python Batch A",
      "code": "PYTHON-BATCH-A-2026",
      "academicYear": "2026",
      "institutionName": "MR Technologies Academy"
    },
    {
      "id": "batch-102",
      "name": "SQL Batch",
      "code": "SQL-BATCH-2027",
      "academicYear": "2027",
      "institutionName": "MR Technologies Academy"
    }
  ]
}
```

---

### 4.5 `POST /api/batches/assign-students`
Enrolls one or more students into a batch. Enforces non-destructive multi-batch enrollment. Automatically assigns all active courses belonging to the batch to the newly enrolled students.

#### Request Body:
```json
{
  "batchId": "batch-1791448621800-6f4b700d",
  "studentIds": [
    "3a695a6e-6443-4d19-afd2-08b708e75c55",
    "8f12345a-1111-2222-3333-444455556666"
  ]
}
```
*(Also supports assigning by email: `emails: ["student1@gmail.com", "student2@gmail.com"]`)*

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "assignedCount": 2,
  "batchId": "batch-1791448621800-6f4b700d",
  "results": [
    { "studentId": "3a695a6e-6443-4d19-afd2-08b708e75c55", "success": true },
    { "studentId": "8f12345a-1111-2222-3333-444455556666", "success": true }
  ]
}
```

---

### 4.6 `POST /api/batches/assign-courses`
Associates one or more courses with a batch. Automatically triggers background enrollment for all active batch students with `assignmentSource = 'batch'`.

#### Request Body:
```json
{
  "batchId": "batch-1791448621800-6f4b700d",
  "courseIds": [
    "2592d9be-4565-439f-933c-5d1fd5886432",
    "6081e7d2-7b0b-46ce-a010-74697669d034"
  ]
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "assignedCount": 2,
  "batchId": "batch-1791448621800-6f4b700d",
  "results": [
    { "courseId": "2592d9be-4565-439f-933c-5d1fd5886432", "success": true },
    { "courseId": "6081e7d2-7b0b-46ce-a010-74697669d034", "success": true }
  ]
}
```

---

### 4.7 `GET /api/batches/template`
Downloads the official Microsoft Excel template formatted for batch bulk imports.
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Filename**: `batch_import_template.xlsx`
- **Sheet 1**: Formatted headers (`batch_name`, `institution`, `year`, `description`) with pre-filled sample rows.
- **Sheet 2**: Reference Guide with registered institutions and academic years.

---

### 4.8 Student Portal Endpoints

#### `GET /api/student/batches`
Returns all active batches the authenticated student is enrolled in, with embedded course previews.
```json
{
  "success": true,
  "batches": [
    {
      "id": "batch-101",
      "name": "Python Batch A",
      "code": "PYTHON-BATCH-A-2026",
      "academicYear": "2026",
      "institutionName": "MR Technologies Academy",
      "enrolledAt": "2026-10-08T08:35:00.000Z",
      "assignedCourseCount": 2,
      "courses": [
        {
          "id": "course-1",
          "title": "Python for Engineers",
          "level": "Intermediate",
          "category": "Programming",
          "thumbnail": "/images/python.png"
        }
      ]
    }
  ]
}
```

#### `GET /api/student/batch-courses`
Returns an aggregated, deduplicated list of all courses available to the student through their active batch memberships.
```json
{
  "success": true,
  "courses": [
    {
      "id": "course-1",
      "title": "Python for Engineers",
      "category": "Programming",
      "level": "Intermediate",
      "batchId": "batch-101",
      "batchName": "Python Batch A",
      "batchYear": "2026",
      "institutionName": "MR Technologies Academy",
      "progressPercentage": 45,
      "enrollmentStatus": "active"
    }
  ]
}
```

---

## 5. User Interface Implementation

### 5.1 Admin Experience (`/admin/batches`)

The Admin Batch Management view provides two complementary display modes:

1. **Cohort Tree Hierarchy View**:
   - Renders collapsible, multi-tier nodes:
     `Institution Node` $\rightarrow$ `Academic Year Node` $\rightarrow$ `Batch Card` $\rightarrow$ `Students & Courses List`.
   - Displays real-time aggregate statistics: Total Batches, Enrolled Students, Assigned Courses per year and institution.
   - Quick action controls:
     - **+ Add Batch**: Contextually pre-fills the institution and year.
     - **Bulk Assign Courses**: Multi-select modal to assign courses directly to any batch.
     - **Bulk Assign Students**: Add multiple students via checkboxes or email list.
     - **View Details**: Direct navigation to batch detail tabs.
2. **Table List View**:
   - Classic searchable data grid with institution, academic year, and status filter pills.
   - Batch status badges (`active`, `upcoming`, `completed`).
3. **Top Action Bar**:
   - **Upload Excel**: Opens the 4-column upload modal with live preview, error validation, and template download.
   - **Bulk Assign Courses**: Direct modal to select batch and multi-select courses.
   - **Create Batch**: Direct modal to manually provision cohorts.

### 5.2 Student Portal Experience (`/student/dashboard`)

1. **"My Academic Cohorts & Batches" Section**:
   - Displays all active cohorts the student belongs to.
   - Lists institution affiliation, academic year, and cohort badge.
   - Displays assigned courses directly inside each cohort card with interactive **"Open Course"** / **"Resume"** buttons.
2. **"Assigned Courses" Section**:
   - Visual origin badges on each course card (`Batch: Python Batch A`), clarifying whether access originates from a specific cohort or a direct assignment.

---

## 6. Access-Control & Revocation Verification

The batch management system adheres strictly to MRTECHLMS access-control guarantees:

| Scenario | Batch A Status | Batch B Status | Direct Grant | Resulting Access to Course X |
| :--- | :--- | :--- | :--- | :--- |
| **Initial Multi-Batch** | Enrolled (offers Course X) | Enrolled (offers Course X) | None | **Granted** (Dual Batch Source) |
| **Remove from Batch A** | Removed | Enrolled (offers Course X) | None | **Preserved** (Granted via Batch B) |
| **Remove from Batch B** | Removed | Removed | None | **Revoked** (403 Forbidden on direct URL) |
| **Mixed Access** | Removed | Removed | Active Direct Grant | **Preserved** (Granted via Direct Grant) |

### Non-Destructive Soft-Revocation
- Removing a student from a batch or revoking an individual enrollment updates `status = 'revoked'` and populates `revokedAt`, `revokedBy`, and `revocationReason`.
- **Zero data loss**: Historical quiz submissions, coding evaluations, progress logs, and certificates are permanently retained.

---

## 7. Verification & QA Status

The implementation has been thoroughly verified through automated E2E test suites and end-to-end browser QA:

- **TypeScript Compilation**: Clean pass (`0 errors`, `npx tsc --noEmit`).
- **Production Bundle**: Successfully built (`vite build` & `esbuild server.ts`, exit code `0`).
- **API Suite**: `scratch/verify-batch-system.ts` verified all 8 core API interactions against live MySQL:
  - `GET /api/batches` $\rightarrow$ `200 OK`
  - `GET /api/batches/hierarchy` $\rightarrow$ `200 OK`
  - `POST /api/batches` $\rightarrow$ `201 Created`
  - `POST /api/batches/assign-students` $\rightarrow$ `200 OK`
  - `POST /api/batches/assign-courses` $\rightarrow$ `200 OK`
  - `GET /api/student/batches` $\rightarrow$ `200 OK`
  - `GET /api/student/batch-courses` $\rightarrow$ `200 OK`
  - `POST /api/batches/import` $\rightarrow$ `200 OK`
  - `GET /api/batches/template` $\rightarrow$ `200 OK`
- **Safe Teardown**: All QA test records automatically and cleanly removed without touching production or existing historical LMS data.
