/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AssessmentViewer } from "../../components/AssessmentViewer.js";
import { useAuth } from "../../context/AuthContext.js";

export function AssessmentViewerPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  if (!assessmentId || !authToken) return null;

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
