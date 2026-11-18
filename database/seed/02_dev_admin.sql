-- =====================================================================
-- MRTECHLMS Development Admin Seed User
-- IMPORTANT: For DEVELOPMENT/TESTING ONLY.
-- For production installations, provision administrators via:
--   npm run create-admin
-- Default credentials: admin@lms.com / admin123
-- =====================================================================

SET NAMES utf8mb4;
INSERT INTO `users` (
  `id`, `organizationId`, `name`, `email`, `role`, `profilePhoto`, `status`, `bookmarkedBlogIds`, `passwordHash`, `createdAt`
) VALUES (
  'usr-default-admin-01',
  'org-default',
  'System Administrator',
  'admin@lms.com',
  'admin',
  NULL,
  'active',
  '[]',
  '$2a$10$wT3pS3xN/yHn5d6e1qFhDuX5qG1x.e6fF4h1s2c3d4e5f6g7h8i9j',
  '2026-09-28T11:06:32.000Z'
) ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);
