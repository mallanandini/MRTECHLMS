/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from "../../types.js";

export interface TourStep {
  id: string;
  target?: string | null; // CSS selector, e.g. '[data-tour="admin-workspace"]', or null for centered modal
  title: string;
  content: string;
  badge?: string;
  parentSubmenuId?: string; // Submenu ID to expand if the target is inside a collapsed submenu
  position?: "right" | "left" | "top" | "bottom" | "center";
}

export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    id: "admin-welcome",
    target: null,
    title: "Welcome to MRTECHLMS Admin Console",
    content: "Your central command center for institutional management, learner administration, course authoring, and evaluation tracking.",
    badge: "Welcome",
    position: "center",
  },
  {
    id: "admin-workspace",
    target: '[data-tour="admin-workspace"]',
    title: "Workspace & Analytics",
    content: "Monitor overall academy metrics on the Dashboard, analyze real-time completion trends in Analytics, and review system-wide alerts.",
    badge: "Workspace",
    position: "right",
  },
  {
    id: "admin-organization",
    target: '[data-tour="admin-organization"]',
    title: "Organization & Batches",
    content: "Configure departments, organizational units, academic years, and learner batches for structured cohorts.",
    badge: "Structure",
    position: "right",
  },
  {
    id: "admin-users",
    target: '[data-tour="admin-users"]',
    title: "People & User Management",
    content: "Add new learners, assign courses, manage access controls, update phone/location details, and perform secure password resets.",
    badge: "Users",
    position: "right",
  },
  {
    id: "admin-courses",
    target: '[data-tour="admin-courses"]',
    title: "Course Curriculum Management",
    content: "Author and publish interactive courses, structure modules and video lessons, and manage learner enrollments.",
    badge: "Courses",
    position: "right",
  },
  {
    id: "admin-learning-paths",
    target: '[data-tour="admin-learning-paths"]',
    title: "Structured Learning Paths",
    content: "Design sequential career tracks and learning paths. Group prerequisite courses to guide learners toward job-ready mastery.",
    badge: "Paths",
    parentSubmenuId: "learning-paths",
    position: "right",
  },
  {
    id: "admin-assessments",
    target: '[data-tour="admin-assessments"]',
    title: "Assessments & Results Engine",
    content: "Build quizzes and coding tests with question banks, time limits, automated grading rubrics, and inspect learner scorecards.",
    badge: "Assessments",
    parentSubmenuId: "assessments",
    position: "right",
  },
  {
    id: "admin-gamification",
    target: '[data-tour="admin-gamification"]',
    title: "Gamification & Community",
    content: "Incentivize progress through XP points, milestone badges, and leaderboards, while moderating student knowledge-sharing blogs.",
    badge: "Engagement",
    position: "right",
  },
  {
    id: "admin-settings",
    target: '[data-tour="admin-settings"]',
    title: "Platform Settings & Integrations",
    content: "Configure enterprise integrations, webhooks, security policies, and personalize platform appearance with light/dark theme palettes.",
    badge: "Settings",
    position: "right",
  },
  {
    id: "admin-tour-launcher",
    target: '[data-tour="sidebar-tour-launcher"]',
    title: "Restart Tour & Navigation Help",
    content: "You're all set! You can relaunch this interactive tour or toggle compact sidebar mode anytime from these navigation controls.",
    badge: "Ready!",
    position: "right",
  },
];

export const STUDENT_TOUR_STEPS: TourStep[] = [
  {
    id: "student-welcome",
    target: null,
    title: "Welcome to MRTECHLMS!",
    content: "Your personalized learning academy. Master hands-on tech skills, solve coding problems, pass assessments, and earn verified credentials.",
    badge: "Welcome",
    position: "center",
  },
  {
    id: "student-dashboard",
    target: '[data-tour="student-dashboard"]',
    title: "My Learning Dashboard",
    content: "Your personal headquarters: review your weekly streak, pick up where you left off, and see upcoming assessment deadlines.",
    badge: "Dashboard",
    position: "right",
  },
  {
    id: "student-courses",
    target: '[data-tour="student-courses"]',
    title: "Browse Courses",
    content: "Explore the academy course catalog, dive into enrolled curriculum modules, and watch video lessons.",
    badge: "Courses",
    position: "right",
  },
  {
    id: "student-learning-paths",
    target: '[data-tour="student-learning-paths"]',
    title: "Guided Learning Paths",
    content: "Follow curated, multi-course roadmaps designed to take you from foundational concepts to advanced professional specializations.",
    badge: "Career Tracks",
    position: "right",
  },
  {
    id: "student-practice",
    target: '[data-tour="student-practice"]',
    title: "Coding Practice Arena",
    content: "Hone your problem-solving skills with hands-on coding challenges across multiple programming languages with real-time test execution.",
    badge: "Coding Arena",
    position: "right",
  },
  {
    id: "student-assessments",
    target: '[data-tour="student-assessments"]',
    title: "Assessments & Quizzes",
    content: "Take your assigned evaluations, timed quizzes, and coding exams, with immediate results and detailed answer breakdowns.",
    badge: "Assessments",
    position: "right",
  },
  {
    id: "student-certificates",
    target: '[data-tour="student-certificates"]',
    title: "Verified Certificates",
    content: "Earn, view, and download verified certificates of achievement upon completing courses and learning tracks to showcase your skills.",
    badge: "Certificates",
    position: "right",
  },
  {
    id: "student-gamification",
    target: '[data-tour="student-gamification"]',
    title: "Achievements & Leaderboard",
    content: "Earn XP points for every milestone, unlock achievement badges, and climb the cohort ranks on the leaderboard.",
    badge: "Rankings",
    parentSubmenuId: "gamification",
    position: "right",
  },
  {
    id: "student-tour-launcher",
    target: '[data-tour="sidebar-tour-launcher"]',
    title: "Help & Tour Controls",
    content: "Whenever you need a refresher on any LMS features or navigation, click 'Take a Tour' here anytime. Happy learning!",
    badge: "Ready!",
    position: "right",
  },
];

export function getTourStepsForRole(role: UserRole): TourStep[] {
  switch (role) {
    case UserRole.ADMIN:
    case UserRole.SUPER_ADMIN:
      return ADMIN_TOUR_STEPS;
    case UserRole.STUDENT:
      return STUDENT_TOUR_STEPS;
    case UserRole.MANAGER:
      return [
        {
          id: "manager-welcome",
          target: null,
          title: "Welcome to Team Management",
          content: "Track your team members' learning journeys, assessment scores, and completion progress.",
          badge: "Manager Portal",
          position: "center",
        },
        ...STUDENT_TOUR_STEPS.slice(1, 4),
      ];
    default:
      return STUDENT_TOUR_STEPS;
  }
}
