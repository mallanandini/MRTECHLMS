# Database Backups Directory

This directory is designated for manual and scheduled MySQL database dumps.

## Safety Notice
- Database dumps containing real user records, student submissions, or production data are **strictly excluded from Git** via `.gitignore`.
- Only schema templates and `.gitkeep` are preserved in source control.

## Generating a Full Database Dump

```bash
mysqldump -u root -p --routines --triggers --events mrtechlms > database/backups/mrtechlms_backup_%date%.sql
```

## Generating a Schema-Only Dump

```bash
mysqldump -u root -p --no-data mrtechlms > database/backups/mrtechlms_schema_only.sql
```
