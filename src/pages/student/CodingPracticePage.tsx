/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { CodingCatalog } from "../../components/coding/CodingCatalog.js";
import { CodingWorkspace } from "../../components/coding/CodingWorkspace.js";
import { CodePlayground } from "../../components/coding/CodePlayground.js";

export function CodingPracticePage() {
  const { authToken, currentUser } = useAuth();
  const { challengeId } = useParams<{ challengeId?: string }>();
  const navigate = useNavigate();

  if (!authToken) return null;

  // 1. Independent Free Code Playground IDE Mode
  if (challengeId === "playground") {
    return (
      <div className="w-full h-full min-w-0 flex-1 flex flex-col">
        <CodePlayground
          authToken={authToken}
          onBackToCatalog={() => navigate("/student/coding-practice")}
          studentName={currentUser?.name || "Student"}
        />
      </div>
    );
  }

  // 2. Specific Challenge Guided IDE Workspace
  if (challengeId) {
    return (
      <div className="w-full h-full min-w-0 flex-1 flex flex-col">
        <CodingWorkspace
          challengeId={challengeId}
          authToken={authToken}
          onBackToCatalog={() => navigate("/student/coding-practice")}
          studentName={currentUser?.name || "Student"}
          studentPhoto={currentUser?.profilePhoto}
        />
      </div>
    );
  }

  // 3. Coding Practice Curriculum & Challenge Catalog
  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 max-w-[1440px] w-full min-w-0 font-sans mx-auto flex-1">
      <CodingCatalog
        authToken={authToken}
        onSelectChallenge={(id) => navigate(`/student/coding-practice/${id}`)}
        onOpenPlayground={() => navigate("/student/coding-practice/playground")}
        studentName={currentUser?.name || "Student"}
      />
    </div>
  );
}
