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
  const { currentUser, authToken } = useAuth();
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

  // Determine user dashboard target if logged in as student
  const getSessionBanner = () => {
    if (!currentUser || !authToken || currentUser.role !== UserRole.STUDENT) return null;

    return (
      <aside 
        aria-label="Active session"
        className="bg-emerald-700 dark:bg-[#111C30] text-white text-xs px-4 py-2 border-b border-emerald-800 dark:border-[#263449] shadow-xs"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-200" />
            <span>
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.email})
            </span>
          </div>

          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-1.5 font-bold hover:underline bg-emerald-800 dark:bg-emerald-600 px-3 py-1 rounded-lg text-white transition cursor-pointer"
          >
            <span>Continue to Student Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    );
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
