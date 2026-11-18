/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserCheck, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";

import { HomeNavbar } from "../components/home/HomeNavbar.js";
import { HomeHero } from "../components/home/HomeHero.js";
import { HomeAbout } from "../components/home/HomeAbout.js";
import { HomePrograms } from "../components/home/HomePrograms.js";
import { HomeServices } from "../components/home/HomeServices.js";
import { HomeWhyUs } from "../components/home/HomeWhyUs.js";
import { HomeJourney } from "../components/home/HomeJourney.js";
import { HomeCareers } from "../components/home/HomeCareers.js";
import { HomeContact } from "../components/home/HomeContact.js";
import { HomeFooter } from "../components/home/HomeFooter.js";

export function CompanyHomePage() {
  const { currentUser, authToken, studentUser, studentToken, adminUser, adminToken } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<string>("Java Full Stack Development");

  const handleScrollTo = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectProgram = (programName: string) => {
    setSelectedProgram(programName);
    handleScrollTo("contact");
  };

  // Determine user dashboard target if logged in
  const getSessionBanner = () => {
    // 1. Student active session
    const isStudent = (studentUser && studentToken) || (currentUser && authToken && currentUser.role === UserRole.STUDENT);
    const activeStudent = studentUser || (isStudent ? currentUser : null);

    if (activeStudent) {
      return (
        <aside 
          aria-label="Active session"
          className="bg-slate-900 text-slate-300 dark:bg-slate-950 dark:text-slate-400 text-xs px-4 sm:px-6 lg:px-8 py-1.5 border-b border-slate-800 shadow-2xs"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                Signed in as <strong className="text-white font-semibold">{activeStudent.name}</strong>
                <span className="hidden sm:inline text-slate-400 font-mono ml-1.5">({activeStudent.email})</span>
              </span>
            </div>

            <Link
              to="/student/dashboard"
              id="banner-back-to-portal-btn"
              className="shrink-0 inline-flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300 text-[11px] sm:text-xs transition-colors cursor-pointer"
            >
              <span>Back to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      );
    }

    // 2. Admin/Manager active session
    const isAdmin = (adminUser && adminToken) || (currentUser && authToken && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.MANAGER));
    const activeAdmin = adminUser || (isAdmin ? currentUser : null);

    if (activeAdmin) {
      const adminPath = activeAdmin.role === UserRole.MANAGER ? "/manager/team" : "/admin/dashboard";
      return (
        <aside 
          aria-label="Active session"
          className="bg-slate-900 text-slate-300 dark:bg-slate-950 dark:text-slate-400 text-xs px-4 sm:px-6 lg:px-8 py-1.5 border-b border-slate-800 shadow-2xs"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                Signed in as <strong className="text-white font-semibold">{activeAdmin.name}</strong>
                <span className="hidden sm:inline text-slate-400 font-mono ml-1.5">({activeAdmin.role})</span>
              </span>
            </div>

            <Link
              to={adminPath}
              id="banner-admin-back-to-portal-btn"
              className="shrink-0 inline-flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 text-[11px] sm:text-xs transition-colors cursor-pointer"
            >
              <span>Back to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden w-full bg-white dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200">
      {/* Active Session Notice Banner if user is authenticated */}
      {getSessionBanner()}

      {/* Responsive Sticky Header with Navigation & prominent Student Login */}
      <HomeNavbar onScrollTo={handleScrollTo} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <HomeHero onExplorePrograms={() => handleScrollTo("programs")} />

        {/* 2. About MR Technologies, Medha XL & RUBIKS Ecosystem */}
        <HomeAbout />

        {/* 3. Industry-Aligned Training Programs Catalog */}
        <HomePrograms onSelectProgram={handleSelectProgram} />

        {/* 4. Our Services across Training, Academic & Staffing */}
        <HomeServices />

        {/* 5. Why Choose MR Technologies Advantages */}
        <HomeWhyUs />

        {/* 6. 5-Stage Learning Journey & Enrolled Student Callout */}
        <HomeJourney />

        {/* 7. RUBIKS Hiring and Career Placement Ecosystem */}
        <HomeCareers />

        {/* 8. Verified Campus Contact & Interactive Admissions Enquiry */}
        <HomeContact initialProgram={selectedProgram} />
      </main>

      {/* Complete Corporate Footer */}
      <HomeFooter onScrollTo={handleScrollTo} />
    </div>
  );
}
export default CompanyHomePage;
