# MRTECHLMS Analytics & Reporting Metrics Specification

This document provides canonical definitions and mathematical formulas for all analytics and reporting metrics calculated within the **MRTECHLMS Analytics & Reporting Engine**. All backend reporting endpoints, dashboards, and exported reports adhere strictly to these definitions to ensure enterprise-wide consistency.

---

## 1. System & Admin Overview Metrics

### 1.1 Total Learners
- **Definition**: The total count of registered non-deleted users assigned the `student` role within the tenant organization.
- **SQL Specification**:
  ```sql
  SELECT COUNT(id) FROM users 
  WHERE role = 'student' AND organizationId = :orgId AND deletedAt IS NULL;
  ```

### 1.2 Active Learners
- **Definition**: The count of distinct learners who performed learning activity (accessed a lesson, made an assessment submission, or had course progress recorded) within the designated date range (default: trailing 30 days).
- **Formula**:
  $$\text{Active Learners} = |\mathcal{U}_{\text{progress}} \cup \mathcal{U}_{\text{submissions}} \cup \mathcal{U}_{\text{enrollments}}|$$
- **SQL Specification**:
  ```sql
  SELECT COUNT(DISTINCT studentId) FROM (
    SELECT studentId FROM progress WHERE organizationId = :orgId AND (completedAt BETWEEN :start AND :end OR lastAccessedAt BETWEEN :start AND :end)
    UNION
    SELECT studentId FROM submissions WHERE organizationId = :orgId AND submittedAt BETWEEN :start AND :end
    UNION
    SELECT studentId FROM enrollments WHERE organizationId = :orgId AND (lastAccessedAt BETWEEN :start AND :end OR completedAt BETWEEN :start AND :end)
  ) AS active_pool;
  ```

### 1.3 Course Catalog Breakdown
- **Definition**: The total number of courses created in the tenant, categorized by publication status (`published`, `draft`, `archived`).
- **SQL Specification**:
  ```sql
  SELECT status, COUNT(id) AS count FROM courses 
  WHERE organizationId = :orgId AND deletedAt IS NULL 
  GROUP BY status;
  ```

### 1.4 Total Enrollments
- **Definition**: The total number of active course assignments/enrollments within the tenant organization (excluding soft-deleted enrollments).
- **SQL Specification**:
  ```sql
  SELECT COUNT(id) FROM enrollments 
  WHERE organizationId = :orgId AND deletedAt IS NULL;
  ```

### 1.5 Course Completion Rate
- **Definition**: The percentage of assigned course enrollments that have been fully satisfied.
- **Formula**:
  $$\text{Course Completion Rate} = \left( \frac{\text{Completed Enrollments}}{\text{Total Enrollments}} \right) \times 100$$
- **Criteria for Completion**:
  - `status = 'completed'` OR `completedAt IS NOT NULL` OR `progressPercentage >= 100`.
- **Edge Case**: If Total Enrollments = 0, Completion Rate = 0%.

### 1.6 Assessment Pass Rate
- **Definition**: The percentage of evaluated assessment attempts that achieved or exceeded the passing threshold.
- **Formula**:
  $$\text{Assessment Pass Rate} = \left( \frac{\sum [\text{passed} = 1]}{\text{Total Submissions}} \right) \times 100$$
- **Edge Case**: If Total Submissions = 0, Pass Rate = 0%.

### 1.7 Average Assessment Score
- **Definition**: The arithmetic mean of percentage scores earned across all assessment submissions within the scope.
- **Formula**:
  $$\text{Average Score} = \frac{1}{N} \sum_{i=1}^{N} \text{percentage}_i$$
- **SQL Specification**:
  ```sql
  SELECT ROUND(AVG(percentage), 1) FROM submissions 
  WHERE organizationId = :orgId;
  ```

### 1.8 Overdue Training
- **Definition**: The count of active course or assessment assignments where the target due date has lapsed, but the requirement has not yet been completed.
- **Criteria**:
  - `dueDate IS NOT NULL` AND `dueDate < NOW()`
  - `status NOT IN ('completed', 'revoked')`
  - `progressPercentage < 100` (for courses)
  - `deletedAt IS NULL`

### 1.9 Certificates Issued
- **Definition**: The total count of accredited certificates awarded in `active` status within the tenant.
- **SQL Specification**:
  ```sql
  SELECT COUNT(id) FROM certificates 
  WHERE organizationId = :orgId AND status = 'active' AND deletedAt IS NULL;
  ```

### 1.10 Learning Activity Trend
- **Definition**: Daily time-series breakdown of learner engagements across the tenant:
  - New enrollments count
  - Course completions count
  - Assessment submissions count
  - Certificates awarded count

---

## 2. Course-Level Analytics

### 2.1 Course Enrollments
- Total learners assigned or enrolled in the specific course.

### 2.2 Course Starts
- The count of enrolled learners who have initiated learning (completed at least 1 lesson OR `progressPercentage > 0`).

### 2.3 Course Completion Count & Percentage
- **Count**: Total enrolled learners who finished all required modules and final assessments.
- **Percentage**: $\frac{\text{Course Completions}}{\text{Course Enrollments}} \times 100$.

### 2.4 Average Completion Time
- **Definition**: The mean elapsed duration from initial enrollment to final course completion.
- **Formula**:
  $$\text{Avg Completion Time (Days)} = \frac{1}{C} \sum_{i=1}^{C} \text{DATEDIFF}(\text{completedAt}_i, \text{enrolledAt}_i)$$
- **Filter**: Calculated exclusively over records where `completedAt IS NOT NULL`.

### 2.5 Drop-off Points & Lesson Bottleneck Analysis
- **Definition**: Identifies modules and lessons with the steepest drop-off in completion.
- **Calculation**: For each lesson in sequence within the course:
  - $\text{Lesson Completion Rate} = \frac{\text{Students who completed lesson}}{\text{Students enrolled in course}} \times 100$
  - $\text{Drop-off Delta} = \text{Completion Rate}(\text{Lesson}_{k-1}) - \text{Completion Rate}(\text{Lesson}_k)$

---

## 3. Assessment-Level Analytics

### 3.1 Total Attempts & Unique Students
- **Attempts**: Total submission records submitted for the assessment.
- **Unique Students**: Distinct count of learners who attempted the assessment.

### 3.2 Pass Rate & Fail Rate
- $\text{Pass Rate} = \frac{\text{Passed Submissions}}{\text{Total Submissions}} \times 100$
- $\text{Fail Rate} = 100 - \text{Pass Rate}$

### 3.3 Score Range & Distribution
- **Average Score**: $\text{AVG}(\text{percentage})$
- **Highest Score**: $\text{MAX}(\text{percentage})$
- **Lowest Score**: $\text{MIN}(\text{percentage})$
- **Distribution Buckets**:
  - `0 - 49%`: Needs Remediation
  - `50 - 69%`: Approaching Passing
  - `70 - 84%`: Proficient
  - `85 - 100%`: Mastery

### 3.4 Question Success Rate & Difficulty Index
- For each question in the assessment item bank:
  - **Success Rate**:
    $$\text{Success Rate} = \left( \frac{\text{Count of Correct Responses}}{\text{Total Responses to Question}} \right) \times 100$$
  - **Difficulty Classification**:
    - $\ge 80\%$: `Easy`
    - $50\% - 79\%$: `Medium`
    - $< 50\%$: `Hard`
  - **Unanswered Rate**:
    $$\text{Unanswered Rate} = \left( \frac{\text{Count of Submissions where Question is Blank/Skipped}}{\text{Total Submissions}} \right) \times 100$$

---

## 4. Learner-Level Analytics

Each learner profile exposes a unified compliance scorecard:
1. **Assigned Learning**: Count of assigned courses, learning paths, and standalone assessments.
2. **Completed Learning**: Count of completed courses, paths, and passed assessments.
3. **Overdue Items**: Real-time count of requirements past due.
4. **Assessment History**: Chronological audit trail of all exam attempts, scores, and pass/fail statuses.
5. **Certificates Earned**: Accredited certificates currently held.
6. **Activity Timeline**: Recent lesson interactions and time-spent logging.

---

## 5. Manager Scoping Boundary

When reporting queries are requested by a `manager` role:
- The learner dataset $\mathcal{L}$ is strictly constrained to authorized subordinates:
  $$\mathcal{L}_{\text{manager}} = \{u \in \text{users} \mid u.\text{managerId} = m \lor u.\text{departmentId} = d_{\text{managed}} \lor u \in \text{cohorts}_{\text{managed}} \lor u \in \text{groups}_{\text{managed}}\}$$
- Cross-department learner queries are blocked with **HTTP 403 Forbidden**.
- All aggregate KPIs on manager dashboards are computed strictly over $\mathcal{L}_{\text{manager}}$.

---

## 6. Report Export Specifications

All generated CSV and XLSX reports stream server-side records with standardized headers:
- **Learners Progress Report**: Student ID, Name, Email, Department, Job Title, Assigned Courses, Completed Courses, Completion Rate, Overdue Count, Total Certificates.
- **Course Completion Report**: Course ID, Title, Category, Status, Total Enrollments, Starts, Completions, Completion Rate %, Avg Completion Days.
- **Assessment Results Report**: Submission ID, Student Name, Student Email, Assessment Title, Score, Total Points, Percentage %, Passed, Submitted At.
- **Overdue Compliance Report**: Item Type, Item Title, Student Name, Student Email, Department, Due Date, Days Overdue, Is Mandatory.
