/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { ThemeProvider } from "./context/ThemeContext.js";

// Routes & Protected Guards
import { StudentProtectedRoute, AdminProtectedRoute } from "./components/routes/ProtectedRoutes.js";

// Layouts
import { StudentLayout } from "./layouts/StudentLayout.js";
import { AdminLayout } from "./layouts/AdminLayout.js";

// Pages
import { PortalGateway } from "./pages/PortalGateway.js";
import { StudentLogin } from "./pages/StudentLogin.js";
import { AdminLogin } from "./pages/AdminLogin.js";
import { AdminRegister } from "./pages/AdminRegister.js";

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
import { AdminCoursesPage } from "./pages/admin/AdminCoursesPage.js";
import { AdminAssessmentsPage } from "./pages/admin/AdminAssessmentsPage.js";
import { AdminBlogPage } from "./pages/admin/AdminBlogPage.js";
import { AdminProfilePage } from "./pages/admin/AdminProfilePage.js";
import { AdminLearningPathsPage } from "./pages/admin/AdminLearningPathsPage.js";
import { AdminLearningPathBuilderPage } from "./pages/admin/AdminLearningPathBuilderPage.js";
import { AdminAssessmentBuilderPage } from "./pages/admin/AdminAssessmentBuilderPage.js";

function AppWithTheme() {
  const { authToken } = useAuth();

  return (
    <ThemeProvider authToken={authToken}>
      <BrowserRouter>
        <Routes>
          {/* Public Portal Gateway & Auth Routes */}
          <Route path="/" element={<PortalGateway />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />

          {/* Student Portal Protected Section */}
          <Route path="/student" element={<StudentProtectedRoute />}>
            <Route element={<StudentLayout />}>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboardPage />} />
              <Route path="courses" element={<CourseCatalogPage />} />
              <Route path="course/:courseId" element={<CoursePlayerPage />} />
              <Route path="learning-paths" element={<StudentLearningPathsPage />} />
              <Route path="learning-path/:pathId" element={<StudentLearningPathPlayerPage />} />
              <Route path="assessments" element={<AssessmentsPage />} />
              <Route path="assessment/:assessmentId" element={<AssessmentViewerPage />} />
              <Route path="coding-practice" element={<CodingPracticePage />} />
              <Route path="coding-practice/:challengeId" element={<CodingPracticePage />} />
              <Route path="practice" element={<Navigate to="/student/coding-practice" replace />} />
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
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:userId/access" element={<AdminUsersPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="learning-paths" element={<AdminLearningPathsPage />} />
              <Route path="learning-paths/new" element={<AdminLearningPathBuilderPage />} />
              <Route path="learning-paths/:pathId/edit" element={<AdminLearningPathBuilderPage />} />
              <Route path="assessments" element={<AdminAssessmentsPage />} />
              <Route path="assessments/new" element={<AdminAssessmentBuilderPage />} />
              <Route path="assessments/:assessmentId/builder" element={<AdminAssessmentBuilderPage />} />
              <Route path="blogs" element={<AdminBlogPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
            </Route>
          </Route>

          {/* Fallback Catch-All Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithTheme />
    </AuthProvider>
  );
}
