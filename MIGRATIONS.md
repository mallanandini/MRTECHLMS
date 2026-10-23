# MRTECHLMS Database Migration Guide

---

## 1. Overview

MRTECHLMS features an integrated, pure-TypeScript migration engine designed for idempotent, zero-data-loss database evolutions.

### Key Guarantees:
- **Crash Safety**: Schema changes are tracked in the `schema_migrations` table with batch numbers and execution timestamps.
- **Idempotency**: DDL operations verify column and index presence via `information_schema` before execution.
- **Data Preservation**: Default values and automated backfilling ensure zero data loss during structural upgrades.
- **Automated Bootstrapping**: The migration runner executes automatically during server startup (`initializeDatabase()`), ensuring newly deployed containers or instances always run on the current schema.

---

## 2. CLI Usage

The following npm commands manage database migrations:

```bash
# Apply all pending migrations in sequential order
npm run migrate

# Check current migration status (applied vs pending, batch numbers, timestamps)
npm run migrate:status

# Roll back the most recently applied batch
npm run migrate:rollback
```

### Sample Status Output:
```
Migration Status Summary:
┌─────────┬───────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────┬───────────┬───────┬─────────────────────────┐
│ (index) │ Version                           │ Name                                                                                            │ Status    │ Batch │ AppliedAt               │
├─────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┼───────────┼───────┼─────────────────────────┤
│ 0       │ '001_initial_baseline'            │ 'Record existing 26 core tables as baseline schema'                                             │ 'APPLIED' │ 1     │ '28/9/2026, 4:36:32 pm' │
│ 1       │ '002_multi_tenancy_organizations' │ 'Create organizations table, default organization, and organizationId on tenant-scoped tables'  │ 'APPLIED' │ 1     │ '28/9/2026, 4:36:34 pm' │
│ 2       │ '003_soft_deletes_and_roles'      │ 'Expand user roles (super_admin, manager) and add soft delete columns (deletedAt) with indexes' │ 'APPLIED' │ 1     │ '28/9/2026, 4:36:34 pm' │
│ 3       │ '004_composite_indexes'           │ 'Add composite performance indexes for multi-tenant querying and high-volume workloads'         │ 'APPLIED' │ 1     │ '28/9/2026, 4:36:35 pm' │
└─────────┴───────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────┴───────────┴───────┴─────────────────────────┘
```

---

## 3. Applied Migrations Catalog

### `001_initial_baseline`
- **Purpose**: Baseline verification of the 26 foundation LMS tables (`users`, `courses`, `assessments`, `questions`, `submissions`, `coding_challenges`, `audit_logs`, etc.).
- **Down**: No-op to preserve operational data.

### `002_multi_tenancy_organizations`
- **Purpose**: Establishes multi-tenant infrastructure.
- **Operations**:
  1. Creates the `organizations` table.
  2. Seeds the default backward-compatibility institution (`org-default`).
  3. Appends `organizationId VARCHAR(36)` to `users`, `courses`, `assessments`, `assessment_assignments`, `submissions`, `learning_paths`, `learning_path_assignments`, `enrollments`, `blogs`, and `audit_logs`.
  4. Backfills existing `NULL` records to `'org-default'`.
  5. Creates `idx_<table_name>_org` indexes on all tenant-owned tables.
- **Down**: Drops added indexes and `organizationId` columns.

### `003_soft_deletes_and_roles`
- **Purpose**: Enables soft deletion and expands administrative role hierarchy.
- **Operations**:
  1. Modifies `users.role` enum to include `'super_admin'` and `'manager'`.
  2. Appends `deletedAt VARCHAR(50) NULL` to `users`, `courses`, `assessments`, `questions`, and `learning_paths`.
  3. Adds `idx_<table_name>_deleted` indexes for query acceleration.
- **Down**: Drops added `deletedAt` columns and indexes.

### `004_composite_indexes`
- **Purpose**: Accelerates multi-tenant filtering, student submission rosters, and reporting queries.
- **Indexes Created**:
  - `idx_users_org_role_status` (`users`: `organizationId`, `role`, `status`)
  - `idx_courses_org_status` (`courses`: `organizationId`, `status`)
  - `idx_assessments_org_status` (`assessments`: `organizationId`, `status`)
  - `idx_assign_student_status` (`assessment_assignments`: `studentId`, `status`)
  - `idx_submissions_student_assessment` (`submissions`: `studentId`, `assessmentId`)
  - `idx_submissions_assessment_date` (`submissions`: `assessmentId`, `submittedAt`)
  - `idx_audit_org_action` (`audit_logs`: `organizationId`, `action`)
- **Down**: Drops composite indexes.

---

## 4. Authoring a New Migration

To author migration `005`:

1. Create `server/migrations/005_feature_name.ts`:
   ```typescript
   import { Pool } from "mysql2/promise";
   import { Migration } from "./types.js";
   import { columnExists, tableExists } from "./utils.js";

   export const migration005: Migration = {
     id: "005_feature_name",
     name: "Description of structural database enhancement",
     up: async (pool: Pool) => {
       // DDL operations here
     },
     down: async (pool: Pool) => {
       // Reversal operations here
     }
   };
   ```
2. Register the migration in `server/migrations/runner.ts`:
   ```typescript
   import { migration005 } from "./005_feature_name.js";
   
   export const ALL_MIGRATIONS: Migration[] = [
     migration001,
     migration002,
     migration003,
     migration004,
     migration005
   ];
   ```
3. Run `npm run migrate` to apply.

---

## 5. Rollback Considerations

- **Production Safeguard**: Soft-deletes and additive columns should rarely be rolled back in live production. Instead, create forward-migrating fixups.
- **Data Integrity**: When rolling back migrations that dropped columns, ensure dependent application code is deployed in lockstep.
