/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AdminDashboardOverview } from "../../components/admin/AdminDashboardOverview.js";
import { useAuth } from "../../context/AuthContext.js";

export function AdminDashboardPage() {
  const { authToken } = useAuth();

  if (!authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 max-w-[1600px] w-full mx-auto min-w-0 font-sans animate-in fade-in duration-150">
      <AdminDashboardOverview authToken={authToken} />
    </div>
  );
}
