/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AssessmentBuilder } from "../../components/admin/AssessmentBuilder.js";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function AdminAssessmentBuilderPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(assessmentId && assessmentId !== "new" ? assessmentId : null);
  const [creating, setCreating] = useState(assessmentId === "new" || !assessmentId);
  const hasCreatedRef = React.useRef(false);

  useEffect(() => {
    if ((assessmentId === "new" || !assessmentId) && !activeId && !hasCreatedRef.current) {
      hasCreatedRef.current = true;
      const createNewDraft = async () => {
        try {
          const res = await fetch("/api/admin/assessments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({
              title: "Untitled Assessment",
              shortDescription: "",
              description: "",
              category: "General",
              difficulty: "medium",
              assessmentType: "practice_test",
              type: "standalone",
              durationMinutes: 20,
              passingScore: 70,
              maxAttempts: 1,
              questionNavigation: "free",
              status: "draft"
            })
          });
          if (res.ok) {
            const data = await res.json();
            setActiveId(data.id);
            navigate(`/admin/assessments/${data.id}/builder`, { replace: true });
          }
        } catch (err) {
          console.error("Failed to create new draft assessment", err);
        } finally {
          setCreating(false);
        }
      };
      createNewDraft();
    }
  }, [assessmentId, authToken]);

  if (!authToken) return null;

  if (creating || !activeId) {
    return (
      <div className="p-8 min-h-[400px] flex flex-col items-center justify-center gap-3 text-slate-500 font-sans">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold">Creating new assessment draft...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 max-w-[1440px] w-full min-w-0 font-sans">
      <div className="flex justify-end mb-2">
        <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
      </div>

      <AssessmentBuilder
        assessmentId={activeId}
        authToken={authToken}
        onBack={() => navigate("/admin/assessments")}
        onSaved={() => {}}
      />
    </div>
  );
}
