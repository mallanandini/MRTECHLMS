/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LearningPathBuilder } from "../../components/admin/LearningPathBuilder.js";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function AdminLearningPathBuilderPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  if (!authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 max-w-[1440px] w-full min-w-0 font-sans">
      <div className="flex justify-end mb-2">
        <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
      </div>

      <LearningPathBuilder
        pathId={pathId || null}
        authToken={authToken}
        onBack={() => navigate("/admin/learning-paths")}
        onSaved={() => {}}
      />
    </div>
  );
}
