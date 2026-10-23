/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { ThemeProvider } from "./context/ThemeContext.js";
import { NotificationProvider } from "./context/NotificationContext.js";
import { TourProvider } from "./context/TourContext.js";
import { ProductTour } from "./components/tour/ProductTour.js";

// Routes & Protected Guards
import { StudentProtectedRoute, AdminProtectedRoute, ManagerProtectedRoute } from "./components/routes/ProtectedRoutes.js";

// Layouts
import { StudentLayout } from "./layouts/StudentLayout.js";
import { AdminLayout } from "./layouts/AdminLayout.js";
import { ManagerLayout } from "./layouts/ManagerLayout.js";

// Pages
import { CompanyHomePage } from "./pages/CompanyHomePage.js";
import { StudentLogin } from "./pages/StudentLogin.js";
import { AdminLogin } from "./pages/AdminLogin.js";

// Student Portal Pages
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage.js";
import { CourseCatalogPage } from "./pages/student/CourseCatalogPage.js";
import { CoursePlayerPage } from "./pages/student/CoursePlayerPage.js";
import { AssessmentsPage } from "./pages/student/AssessmentsPage.js";
import { AssessmentViewerPage } from "./pages/student/AssessmentViewerPage.js";
import { CodingPracticePage } from "./pages/student/CodingPracticePage.js";
import { StudentBlogPage } from "./pages/student/BlogPage.js";
import { StudentProfilePage } from "./pages/student/ProfilePage.js";
import { StudentLearningPathsPage } from "./pages/student/LearningPathsPage.js";
import { StudentLearningPathPlayerPage } from "./pages/student/LearningPathPlayerPage.js";

// Admin Portal Pages
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage.js";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage.js";
import { AdminAccessManagementPage } from "./pages/admin/AdminAccessManagementPage.js";
import { AdminCoursesPage } from "./pages/admin/AdminCoursesPage.js";
import { AdminAssessmentsPage } from "./pages/admin/AdminAssessmentsPage.js";
import { AdminBlogPage } from "./pages/admin/AdminBlogPage.js";
import { AdminProfilePage } from "./pages/admin/AdminProfilePage.js";
import { AdminLearningPathsPage } from "./pages/admin/AdminLearningPathsPage.js";
import { AdminLearningPathBuilderPage } from "./pages/admin/AdminLearningPathBuilderPage.js";
import { AdminAssessmentBuilderPage } from "./pages/admin/AdminAssessmentBuilderPage.js";
import { AdminAssessmentResultsPage } from "./pages/admin/AdminAssessmentResultsPage.js";
import { AdminBatchesPage } from "./pages/admin/AdminBatchesPage.js";
import { AdminBatchDetailPage } from "./pages/admin/AdminBatchDetailPage.js";
import { AdminCertificatesPage } from "./pages/admin/AdminCertificatesPage.js";
import { AdminOrganizationPage } from "./pages/admin/AdminOrganizationPage.js";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage.js";
import { AdminAnalyticsPage } from "./pages/admin/AdminAnalyticsPage.js";
import { AdminGamificationPage } from "./pages/admin/AdminGamificationPage.js";
import { AdminIntegrationsPage } from "./pages/admin/AdminIntegrationsPage.js";
import { ManagerTeamPage } from "./pages/manager/ManagerTeamPage.js";
import { StudentCertificatesPage } from "./pages/student/StudentCertificatesPage.js";
import { StudentGamificationPage } from "./pages/student/StudentGamificationPage.js";
import { PublicCertificateVerificationPage } from "./pages/PublicCertificateVerificationPage.js";

function AppWithTheme() {
  const { authToken } = useAuth();

  return (
    <ThemeProvider authToken={authToken}>
      <NotificationProvider>
        <TourProvider>
          <Routes>
          {/* Public Company Homepage & Student Auth */}
          <Route path="/" element={<CompanyHomePage />} />
          <Route path="/gateway" element={<Navigate to="/" replace />} />
          <Route path="/student/login" element={<StudentLogin />} />
          {/* Separate, Hidden Admin Entry Point */}
          <Route path="/manage-portal" element={<AdminLogin />} />
          <Route path="/admin/login" element={<Navigate to="/manage-portal" replace />} />
          <Route path="/admin/register" element={<Navigate to="/manage-portal" replace />} />
          <Route path="/verify-certificate" element={<PublicCertificateVerificationPage />} />
          <Route path="/verify-certificate/:code" element={<PublicCertificateVerificationPage />} />

          {/* Student Portal Protected Section */}
          <Route path="/student" element={<StudentProtectedRoute />}>
            <Route element={<StudentLayout />}>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboardPage />} />
              <Route path="courses" element={<CourseCatalogPage />} />
              <Route path="course/:courseId" element={<CoursePlayerPage />} />
              <Route path="learning-paths" element={<Navigate to="/student/courses" replace />} />
              <Route path="learning-path/:pathId" element={<Navigate to="/student/courses" replace />} />
              <Route path="certificates" element={<StudentCertificatesPage />} />
              <Route path="assessments" element={<AssessmentsPage />} />
              <Route path="assessment" element={<Navigate to="/student/assessments" replace />} />
              <Route path="assessment/:assessmentId" element={<AssessmentViewerPage />} />
              <Route path="coding-practice" element={<CodingPracticePage />} />
              <Route path="coding-practice/:challengeId" element={<CodingPracticePage />} />
              <Route path="practice" element={<Navigate to="/student/coding-practice" replace />} />
              <Route path="gamification" element={<StudentGamificationPage />} />
              <Route path="leaderboard" element={<StudentGamificationPage defaultTab="leaderboard" />} />
              <Route path="badges" element={<StudentGamificationPage defaultTab="badges" />} />
              <Route path="blogs" element={<StudentBlogPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="settings" element={<Navigate to="/student/profile" replace />} />
            </Route>
          </Route>

          {/* Admin Portal Protected Section */}
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="gamification" element={<AdminGamificationPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="access" element={<AdminAccessManagementPage />} />
              <Route path="users/:userId/access" element={<AdminAccessManagementPage />} />
              <Route path="batches" element={<AdminBatchesPage />} />
              <Route path="batches/:batchId" element={<AdminBatchDetailPage />} />
              <Route path="organization" element={<AdminOrganizationPage />} />
              <Route path="integrations" element={<AdminIntegrationsPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="learning-paths" element={<Navigate to="/admin/courses" replace />} />
              <Route path="learning-paths/new" element={<Navigate to="/admin/courses" replace />} />
              <Route path="learning-paths/:pathId/edit" element={<Navigate to="/admin/courses" replace />} />
              <Route path="certificates" element={<AdminCertificatesPage />} />
              <Route path="assessments" element={<AdminAssessmentsPage />} />
              <Route path="assessments/new" element={<AdminAssessmentBuilderPage />} />
              <Route path="assessments/:assessmentId/builder" element={<AdminAssessmentBuilderPage />} />
              <Route path="assessments/:assessmentId/edit" element={<AdminAssessmentBuilderPage />} />
              <Route path="assessment-results" element={<AdminAssessmentResultsPage />} />
              <Route path="results" element={<AdminAssessmentResultsPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="blogs" element={<AdminBlogPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
            </Route>
          </Route>

          {/* Manager Portal Protected Section */}
          <Route path="/manager" element={<ManagerProtectedRoute />}>
            <Route element={<ManagerLayout />}>
              <Route index element={<Navigate to="/manager/team" replace />} />
              <Route path="team" element={<ManagerTeamPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage isManagerView={true} />} />
              <Route path="progress" element={<ManagerTeamPage />} />
              <Route path="assessments" element={<ManagerTeamPage />} />
              <Route path="certificates" element={<ManagerTeamPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="settings" element={<Navigate to="/manager/profile" replace />} />
            </Route>
          </Route>

          {/* Fallback Catch-All Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ProductTour />
      </TourProvider>
    </NotificationProvider>
  </ThemeProvider>
);
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWithTheme />
      </AuthProvider>
    </BrowserRouter>
  );
}
