/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AssessmentViewer } from "../../components/AssessmentViewer.js";
import { useAuth } from "../../context/AuthContext.js";

export function AssessmentViewerPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  if (!assessmentId) {
    return <Navigate to="/student/assessments" replace />;
  }

  if (!authToken) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-xs font-semibold">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        Authenticating...
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <AssessmentViewer
        assessmentId={assessmentId}
        authToken={authToken}
        onBack={() => navigate("/student/assessments")}
        onCompleted={() => navigate("/student/assessments")}
      />
    </div>
  );
}
