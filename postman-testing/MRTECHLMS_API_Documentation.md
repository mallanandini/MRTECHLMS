# MRTECHLMS API Documentation

This document provides complete, production-grade technical documentation for all backend API endpoints of the **MRTECHLMS** enterprise Learning Management System platform.

All documented endpoints reflect the actual implementation in `server.ts` and associated route controllers.

---

## Table of Contents

1. [1. Authentication APIs](#1-authentication-apis)
2. [2. Admin APIs](#2-admin-apis)
3. [3. User Management APIs](#3-user-management-apis)
4. [4. Course Management APIs](#4-course-management-apis)
5. [5. Module Management APIs](#5-module-management-apis)
6. [6. Lesson Management APIs](#6-lesson-management-apis)
7. [7. Video Session APIs](#7-video-session-apis)
8. [8. Text Material APIs](#8-text-material-apis)
9. [9. Assessment APIs](#9-assessment-apis)
10. [10. Assessment Question APIs](#10-assessment-question-apis)
11. [11. Course Assignment APIs](#11-course-assignment-apis)
12. [12. Assessment Assignment APIs](#12-assessment-assignment-apis)
13. [13. Student APIs](#13-student-apis)
14. [14. Student Progress APIs](#14-student-progress-apis)
15. [15. Assessment Submission APIs](#15-assessment-submission-apis)
16. [16. Profile APIs](#16-profile-apis)
17. [17. Security & Role Isolation Testing](#17-security-role-isolation-testing)

---

## Global Architecture & Authentication

- **Base URL**: `http://localhost:3000` (Default local development)
- **Authentication Scheme**: Standard HTTP Bearer Token (`Authorization: Bearer <jwt_token>`)
- **Token Signing**: HMAC SHA-256 via `jsonwebtoken`
- **Role Hierarchy**:
  - `super_admin` / `admin`: Full platform administration, course creation, batch allocation, user provisioning, assessment design, and evaluation.
  - `student`: Assigned course navigation, lesson progress tracking, document streaming, assessment attempts, and profile personalization.
  - `trainer`: Deactivated / Disabled in accordance with enterprise policy.
- **Tenant Isolation**: Multi-tenant database boundary enforced via `organizationId`.
- **Content Types**: All standard endpoints accept and return `application/json` with UTF-8 encoding. Media and document streaming routes return native MIME types (e.g. `application/pdf`).

---

## 1. Authentication APIs

### 1.1 Admin Login - Valid Credentials

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Authentication**: Public / None
- **Required User Role**: `Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}",
  "portal": "admin"
}
```

#### Response & Validation Criteria

- Status code is 200
- Token received and role is admin

---

### 1.2 Student Login - Valid Credentials

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Authentication**: Public / None
- **Required User Role**: `Student / Public`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "email": "{{studentEmail}}",
  "password": "{{studentPassword}}",
  "portal": "student"
}
```

#### Response & Validation Criteria

- Status code is 200
- Token received and role is student

---

### 1.3 Get Current Session User (Me)

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/auth/me`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Student / Public`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Current user matches session

---

### 1.4 Verify Public Self-Registration Disabled

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/register`
- **Authentication**: Public / None
- **Required User Role**: `Student / Public`
- **Expected Status Code**: `403 Forbidden`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "name": "Guest Self Register",
  "email": "guest@example.com",
  "password": "Password123!"
}
```

#### Response & Validation Criteria

- Status code is 403 Forbidden
- Registration guard message verified

---

### 1.5 Verify Admin Self-Registration Disabled

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/admin-register`
- **Authentication**: Public / None
- **Required User Role**: `Admin`
- **Expected Status Code**: `403 Forbidden`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "name": "Rogue Admin",
  "email": "rogue@example.com",
  "password": "Password123!"
}
```

#### Response & Validation Criteria

- Status code is 403 Forbidden
- Admin registration guard verified

---

### 1.6 Negative Auth - Invalid Password

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Authentication**: Public / None
- **Required User Role**: `Student / Public`
- **Expected Status Code**: `401 Unauthorized`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "email": "{{adminEmail}}",
  "password": "WrongPassword!99",
  "portal": "admin"
}
```

#### Response & Validation Criteria

- Status code is 401 Unauthorized
- Invalid credentials error message

---

### 1.7 Negative Auth - Empty Credentials Validation

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Authentication**: Public / None
- **Required User Role**: `Student / Public`
- **Expected Status Code**: `400 Bad Request`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "email": "",
  "password": "",
  "portal": "admin"
}
```

#### Response & Validation Criteria

- Status code is 400 Bad Request

---

## 2. Admin APIs

### 2.1 Admin Dashboard Overview Metrics

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/dashboard`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Dashboard contains analytics or overview metrics

---

### 2.2 Admin System Audit Logs

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/audit-logs`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Audit logs is array

---

### 2.3 List Academic Batches

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/batches`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Batches list returned

---

### 2.4 Create Academic Batch

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/batches`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "name": "Postman Automated Batch {{$timestamp}}",
  "code": "BATCH-PM-{{$timestamp}}",
  "institution": "MR Technologies Academy",
  "academicYear": "2026",
  "description": "Batch created via automated Postman testing",
  "maxStudents": 60
}
```

#### Response & Validation Criteria

- Status code is 201
- Batch ID created

---

### 2.5 Get Batch Details by ID

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/batches/{{batchId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Batch matches requested ID

---

### 2.6 Update Batch Details

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/batches/{{batchId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "description": "Updated description via Postman",
  "maxStudents": 75
}
```

#### Response & Validation Criteria

- Status code is 200

---

### 2.7 Assign Students to Batch

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/batches/assign-students`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "batchId": "{{batchId}}",
  "studentEmails": [
    "{{studentEmail}}"
  ]
}
```

#### Response & Validation Criteria

- Status code is 200
- Success flag is true

---

### 2.8 List Academic Institutions

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/institutions`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Institutions is array

---

## 3. User Management APIs

### 3.1 List All Users

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/users`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Users list returned

---

### 3.2 Create Individual User (Student)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/users`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "name": "Test Postman User",
  "email": "pm.test.{{$timestamp}}@example.com",
  "password": "Student@123",
  "role": "student",
  "phoneNumber": "9876543210",
  "location": "Hyderabad",
  "batchIds": [
    "{{batchId}}"
  ]
}
```

#### Response & Validation Criteria

- Status code is 201
- User created without exposing passwordHash

---

### 3.3 Get User Access & Enrollment Matrix

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/users/{{newUserId}}/access`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Access details loaded

---

### 3.4 Get User Batch Memberships

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/users/{{newUserId}}/batches`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Batches array returned

---

### 3.5 Update User Information

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/users/{{newUserId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "name": "Updated Postman User",
  "location": "Bengaluru",
  "phoneNumber": "9876543211"
}
```

#### Response & Validation Criteria

- Status code is 200
- Updated location verified

---

### 3.6 Admin Reset User Password

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/users/{{newUserId}}/reset-password`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "newPassword": "NewSecurePassword@123",
  "confirmPassword": "NewSecurePassword@123"
}
```

#### Response & Validation Criteria

- Status code is 200
- Password reset confirmed

---

### 3.7 Update User Status (Suspend User)

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/users/{{newUserId}}/status`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "status": "suspended"
}
```

#### Response & Validation Criteria

- Status code is 200
- Status changed to suspended

---

### 3.8 Restore User Status (Re-activate User)

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/users/{{newUserId}}/status`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "status": "active"
}
```

#### Response & Validation Criteria

- Status code is 200
- Status restored to active

---

## 4. Course Management APIs

### 4.1 Admin List All Courses

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/courses`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Courses is an array

---

### 4.2 Create New Course (Draft)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/courses`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "API Architecture & Quality Engineering {{$timestamp}}",
  "shortDescription": "End-to-end API testing masterclass.",
  "description": "Comprehensive curriculum covering REST, GraphQL, databases, and automated testing.",
  "category": "Software Engineering",
  "difficulty": "Intermediate",
  "estimatedDuration": "25 hours",
  "thumbnail": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
  "status": "draft"
}
```

#### Response & Validation Criteria

- Status code is 201
- Course ID returned

---

### 4.3 Get Course Details by ID

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Course ID matches

---

### 4.4 Update Course Details

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "difficulty": "Advanced",
  "estimatedDuration": "30 hours"
}
```

#### Response & Validation Criteria

- Status code is 200
- Updated duration verified

---

### 4.5 Validate Course Pre-Publish Requirements

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}/validate`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Validation checklist returned

---

### 4.6 Attempt Publish Empty Course (Expect Guard 422)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}/publish`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `422 Unprocessable Entity`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 422 Unprocessable Entity
- Pre-publish guard rejected empty course

---

## 5. Module Management APIs

### 5.1 Create Module within Course

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}/modules`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "Module 1: RESTful Architecture & Protocol Specs",
  "description": "Comprehensive coverage of HTTP specs, REST maturity models, and caching headers.",
  "order": 1,
  "status": "published"
}
```

#### Response & Validation Criteria

- Status code is 201
- Module ID created

---

### 5.2 Update Module Details

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/modules/{{moduleId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "Module 1: Advanced RESTful Architecture & Security Specs",
  "description": "Updated description with security emphasis."
}
```

#### Response & Validation Criteria

- Status code is 200
- Title updated

---

### 5.3 Reorder Course Modules

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}/modules/reorder`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "moduleIds": [
    "{{moduleId}}"
  ]
}
```

#### Response & Validation Criteria

- Status code is 200

---

## 6. Lesson Management APIs

### 6.1 Create Generic Lesson

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/modules/{{moduleId}}/lessons`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "Lesson 1: Foundations of REST APIs",
  "description": "Foundational concepts of HTTP verbs, status codes, and idempotency.",
  "type": "text",
  "content": "### REST Fundamentals\nAPIs provide uniform interfaces to access and manipulate server resources.",
  "order": 1,
  "durationMinutes": 15,
  "status": "published"
}
```

#### Response & Validation Criteria

- Status code is 201
- Lesson ID created

---

### 6.2 Update Lesson Details

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/lessons/{{lessonId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "Lesson 1: Foundations of REST APIs (Updated)",
  "durationMinutes": 20
}
```

#### Response & Validation Criteria

- Status code is 200
- Duration updated

---

### 6.3 Duplicate Lesson

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/lessons/{{lessonId}}/duplicate`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 201
- Duplicated lesson created

---

### 6.4 Delete Duplicated Lesson

- **Method**: `DELETE`
- **URL**: `{{baseUrl}}/api/admin/lessons/{{duplicatedLessonId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200

---

## 7. Video Session APIs

### 7.1 Create Video Session Lesson (YouTube URL)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/modules/{{moduleId}}/lessons`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "Video Session: REST API Design Deep Dive",
  "description": "Video lecture explaining resource uri modeling and status code selections.",
  "type": "video",
  "videoUrl": "https://www.youtube.com/watch?v=d56mG7DezGs",
  "order": 2,
  "durationMinutes": 25,
  "status": "published"
}
```

#### Response & Validation Criteria

- Status code is 201
- Video lesson created with valid URL

---

### 7.2 Verify Video Lesson in Course Structure

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Video lesson exists within module structure

---

## 8. Text Material APIs

### 8.1 Create Rich Text Reading Lesson

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/modules/{{moduleId}}/lessons`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "Text Material: API Security Checklist",
  "description": "Key security principles covering token lifetimes, HTTPS, and authorization headers.",
  "type": "text",
  "content": "### API Security Best Practices\n1. Always enforce TLS 1.3\n2. Verify JWT expiry and signature\n3. Protect against OWASP API Security Top 10 vulnerabilities",
  "order": 3,
  "durationMinutes": 15,
  "status": "published"
}
```

#### Response & Validation Criteria

- Status code is 201
- Text material created

---

### 8.2 Create PDF Reading Material Lesson

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/modules/{{moduleId}}/lessons`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "PDF Document: Interactive Architecture Guide",
  "description": "Protected PDF document covering enterprise system designs.",
  "type": "pdf",
  "materialUrl": "/storage/materials/sample-interactive-lesson.pdf",
  "order": 4,
  "durationMinutes": 20,
  "status": "published"
}
```

#### Response & Validation Criteria

- Status code is 201
- PDF material created

---

## 9. Assessment APIs

### 9.1 List Assessments

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/assessments`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Assessments list is array

---

### 9.2 Create Assessment (Draft)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "title": "REST API Architecture & Protocol Certification Exam {{$timestamp}}",
  "description": "Comprehensive assessment on REST semantics, HTTP status codes, and API security.",
  "courseId": "{{courseId}}",
  "moduleId": "{{moduleId}}",
  "type": "module_exam",
  "durationMinutes": 30,
  "passingScore": 70,
  "totalPoints": 100,
  "maxAttempts": 3,
  "status": "draft"
}
```

#### Response & Validation Criteria

- Status code is 201
- Assessment ID created

---

### 9.3 Get Assessment Details by ID

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Assessment matches ID

---

### 9.4 Update Assessment Details

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "durationMinutes": 35,
  "passingScore": 60
}
```

#### Response & Validation Criteria

- Status code is 200
- Passing score updated

---

### 9.5 Pre-Publish Checklist Guard (Empty Questions Rejection)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/publish`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Public`
- **Expected Status Code**: `400 Bad Request`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 400 Bad Request
- Checklist error specifies question requirement

---

## 10. Assessment Question APIs

### 10.1 Create Single Choice Question

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/questions`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "questionText": "Which HTTP status code is most appropriate for a newly created resource?",
  "type": "single_choice",
  "options": [
    "200 OK",
    "201 Created",
    "204 No Content",
    "202 Accepted"
  ],
  "correctAnswers": [
    "201 Created"
  ],
  "explanation": "201 Created indicates that the request has succeeded and led to the creation of a resource.",
  "points": 10,
  "order": 1,
  "difficulty": "easy"
}
```

#### Response & Validation Criteria

- Status code is 201
- Question ID returned

---

### 10.2 Create Multiple Choice Question

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/questions`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "questionText": "Which of the following HTTP methods are idempotent by specification?",
  "type": "multiple_choice",
  "options": [
    "GET",
    "PUT",
    "DELETE",
    "POST"
  ],
  "correctAnswers": [
    "GET",
    "PUT",
    "DELETE"
  ],
  "explanation": "GET, PUT, and DELETE are idempotent according to RFC 7231.",
  "points": 15,
  "order": 2,
  "difficulty": "medium"
}
```

#### Response & Validation Criteria

- Status code is 201
- Multiple choice question created

---

### 10.3 Create Subjective Question

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/questions`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `201 Created`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "questionText": "Explain the difference between authentication and authorization in modern API security.",
  "type": "subjective",
  "points": 25,
  "order": 3,
  "difficulty": "medium"
}
```

#### Response & Validation Criteria

- Status code is 201
- Subjective question created

---

### 10.4 Reorder Assessment Questions

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/reorder-questions`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "questionIds": [
    "{{singleChoiceQId}}",
    "{{multiChoiceQId}}",
    "{{subjectiveQId}}"
  ]
}
```

#### Response & Validation Criteria

- Status code is 200

---

### 10.5 Publish Assessment (Checklist Guard Satisfied)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/publish`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 200
- Assessment published confirmed

---

## 11. Course Assignment APIs

### 11.1 Publish Course (Pre-publish Requirements Met)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}/publish`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 200
- Course published successfully

---

### 11.2 Assign Course to Batch

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/batches/assign-courses`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "batchId": "{{batchId}}",
  "courseIds": [
    "{{courseId}}"
  ]
}
```

#### Response & Validation Criteria

- Status code is 200
- Assignment succeeded

---

### 11.3 Inspect Course Access Matrix

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/courses/{{courseId}}/access`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Access matrix returned as array

---

## 12. Assessment Assignment APIs

### 12.1 Assign Assessment to Student by Email

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/assign`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "studentEmails": [
    "{{studentEmail}}"
  ],
  "isMandatory": true
}
```

#### Response & Validation Criteria

- Status code is 200
- Assigned count confirmed

---

### 12.2 Verify Assessment Access Roster

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/access`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin / Super Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Roster returned as array

---

## 13. Student APIs

### 13.1 Student Assigned Courses Catalog

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/courses`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Courses catalog is array

---

### 13.2 Student Direct Enroll Attempt (Security Policy Guard)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/student/courses/{{courseId}}/enroll`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `403 Forbidden`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 403 Forbidden
- Self-enrollment prevention message

---

### 13.3 Student Course Overview & Syllabus

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/courses/{{courseId}}/overview`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Course outline loaded

---

### 13.4 Student Stream PDF Material (View-Only Protected)

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/courses/{{courseId}}/lessons/{{pdfLessonId}}/pdf`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Content-Type is application/pdf
- Content-Disposition is inline

---

### 13.5 Student Assigned Assessments Catalog

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/assessments`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Assessments list is array

---

### 13.6 Student View Assessment Public Details

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/assessments/{{assessmentId}}`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Assessment metadata received

---

## 14. Student Progress APIs

### 14.1 Student Track Video Playback Progress

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/student/lessons/{{videoLessonId}}/progress`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "completed": true,
  "timeSpentSeconds": 150,
  "progressPercent": 100
}
```

#### Response & Validation Criteria

- Status code is 200
- Progress recorded

---

### 14.2 Update Text Lesson Progress State

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/student/lessons/{{textLessonId}}/progress`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "completed": true,
  "timeSpentSeconds": 120,
  "progressPercent": 100
}
```

#### Response & Validation Criteria

- Status code is 200

---

### 14.3 Get Course Progress Metrics

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/courses/{{courseId}}/progress`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Progress percentage returned

---

### 14.4 Student Resume Learning Next Lesson

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/courses/{{courseId}}/resume`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Resume position returned

---

## 15. Assessment Submission APIs

### 15.1 Start Assessment Examination Attempt

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/assessments/{{assessmentId}}/start`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{}
```

#### Response & Validation Criteria

- Status code is 200 or 201
- Attempt ID created and questions returned

---

### 15.2 Student Save Draft Answers

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/assessments/{{assessmentId}}/save-answers`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "attemptId": "{{attemptId}}",
  "answers": {
    "{{singleChoiceQId}}": [
      "201 Created"
    ]
  }
}
```

#### Response & Validation Criteria

- Status code is 200
- Answers saved successfully

---

### 15.3 Record Proctoring Event

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/assessments/{{assessmentId}}/proctoring-event`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "attemptId": "{{attemptId}}",
  "eventType": "tab_switch",
  "details": "Student switched active browser tab during exam",
  "severity": "medium"
}
```

#### Response & Validation Criteria

- Status code is 200
- Proctoring violation logged

---

### 15.4 Submit Assessment & Compute Score

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/assessments/{{assessmentId}}/submit`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "attemptId": "{{attemptId}}",
  "answers": {
    "{{singleChoiceQId}}": [
      "201 Created"
    ],
    "{{multiChoiceQId}}": [
      "GET",
      "PUT",
      "DELETE"
    ],
    "{{subjectiveQId}}": [
      "Authentication verifies user identity; authorization determines access rights."
    ]
  },
  "timeTakenSeconds": 45
}
```

#### Response & Validation Criteria

- Status code is 200
- Score computed and submission created

---

### 15.5 Student View Submission Result Breakdown

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/student/assessments/{{assessmentId}}/result`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Result breakdown has score and questions

---

### 15.6 Admin Gradebook Review Assessment Submissions

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/assessments/{{assessmentId}}/results`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Submissions array returned

---

### 15.7 Admin Review Individual Submission Details

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/results/submission/{{submissionId}}`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Detailed breakdown loaded

---

## 16. Profile APIs

### 16.1 Get Current Student Profile

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/auth/me`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 200
- Student email matches

---

### 16.2 Update Student User Preferences (Theme)

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/user/preferences`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "theme": "ocean-teal",
  "mode": "dark"
}
```

#### Response & Validation Criteria

- Status code is 200
- Preferences updated

---

### 16.3 Update Student Profile Details

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/student/profile`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Student`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "location": "Hyderabad",
  "phoneNumber": "9876543210"
}
```

#### Response & Validation Criteria

- Status code is 200

---

### 16.4 Update Admin User Preferences (Theme)

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/user/preferences`
- **Authentication**: Bearer Token (`Bearer {{adminToken}}`)
- **Required User Role**: `Admin`
- **Expected Status Code**: `200 OK`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{adminToken}}` | User JWT bearer token |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "theme": "royal-purple",
  "mode": "dark"
}
```

#### Response & Validation Criteria

- Status code is 200
- Admin theme updated

---

## 17. Security & Role Isolation Testing

### 17.1 Missing Authentication Token Rejection

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/users`
- **Authentication**: Public / None
- **Required User Role**: `Security Verification Context`
- **Expected Status Code**: `401 Unauthorized`

#### Headers

*No custom headers required.*

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 401 Unauthorized

---

### 17.2 Role Escalation Defense - Student Access to Admin Endpoint

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/users`
- **Authentication**: Bearer Token (`Bearer {{studentToken}}`)
- **Required User Role**: `Security Verification Context`
- **Expected Status Code**: `403 Forbidden`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer {{studentToken}}` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 403 Forbidden
- Admin role required guard triggered

---

### 17.3 Tampered / Corrupted JWT Signature Rejection

- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/admin/users`
- **Authentication**: Bearer Token (`Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.tamperedsignature`)
- **Required User Role**: `Security Verification Context`
- **Expected Status Code**: `401 Unauthorized`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.tamperedsignature` | User JWT bearer token |

#### Request Body

*None (empty body)*

#### Response & Validation Criteria

- Status code is 401 Unauthorized

---

### 17.4 Cross-Portal Access Denial (Admin on Student Portal)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Authentication**: Public / None
- **Required User Role**: `Security Verification Context`
- **Expected Status Code**: `403 Forbidden`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}",
  "portal": "student"
}
```

#### Response & Validation Criteria

- Status code is 403 Forbidden
- Portal separation error returned

---

### 17.5 Cross-Portal Access Denial (Student on Admin Portal)

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Authentication**: Public / None
- **Required User Role**: `Security Verification Context`
- **Expected Status Code**: `403 Forbidden`

#### Headers

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard payload encoding |

#### Request Body (`application/json`)

```json
{
  "email": "{{studentEmail}}",
  "password": "{{studentPassword}}",
  "portal": "admin"
}
```

#### Response & Validation Criteria

- Status code is 403 Forbidden
- Portal separation error returned

---

