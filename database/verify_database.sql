-- =====================================================================
-- MRTECHLMS - DATABASE VERIFICATION SCRIPT
-- Validates table counts, foreign keys, and seed reference records
-- =====================================================================

USE `mrtechlms`;

-- Check 1: Table Count (Expect exactly 70 tables)
SELECT 
  COUNT(*) as actual_tables_count,
  70 as expected_tables_count,
  CASE WHEN COUNT(*) = 70 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';

-- Check 2: Foreign Key Constraints Count (Expect exactly 55 foreign keys)
SELECT 
  COUNT(*) as actual_fk_count,
  55 as expected_fk_count,
  CASE WHEN COUNT(*) >= 55 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL;

-- Check 3: Schema Migrations (Expect 19 applied migrations)
SELECT 
  COUNT(*) as actual_migrations,
  19 as expected_migrations,
  CASE WHEN COUNT(*) = 19 THEN 'PASS' ELSE 'FAIL' END as status
FROM schema_migrations;

-- Check 4: Reference Data Presence
SELECT 'organizations' as entity, COUNT(*) as count, CASE WHEN COUNT(*) >= 1 THEN 'PASS' ELSE 'FAIL' END as status FROM organizations
UNION ALL
SELECT 'certificate_templates', COUNT(*), CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END FROM certificate_templates
UNION ALL
SELECT 'gamification_badges', COUNT(*), CASE WHEN COUNT(*) >= 12 THEN 'PASS' ELSE 'FAIL' END FROM gamification_badges
UNION ALL
SELECT 'gamification_configs', COUNT(*), CASE WHEN COUNT(*) >= 1 THEN 'PASS' ELSE 'FAIL' END FROM gamification_configs
UNION ALL
SELECT 'notification_templates', COUNT(*), CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END FROM notification_templates
UNION ALL
SELECT 'coding_chapters', COUNT(*), CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END FROM coding_chapters
UNION ALL
SELECT 'coding_topics', COUNT(*), CASE WHEN COUNT(*) >= 41 THEN 'PASS' ELSE 'FAIL' END FROM coding_topics
UNION ALL
SELECT 'coding_challenges', COUNT(*), CASE WHEN COUNT(*) >= 38 THEN 'PASS' ELSE 'FAIL' END FROM coding_challenges
UNION ALL
SELECT 'admin_users', COUNT(*), CASE WHEN COUNT(*) >= 1 THEN 'PASS' ELSE 'FAIL' END FROM users WHERE role = 'admin';
