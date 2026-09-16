/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useParams } from "react-router-dom";
import { LearningPathPlayer } from "../../components/LearningPathPlayer.js";
import { useAuth } from "../../context/AuthContext.js";

export function StudentLearningPathPlayerPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const { authToken } = useAuth();

  if (!authToken || !pathId) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 max-w-[1440px] w-full min-w-0 font-sans">
      <LearningPathPlayer pathId={pathId} authToken={authToken} />
    </div>
  );
}
