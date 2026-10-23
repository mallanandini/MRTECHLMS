/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Briefcase, Building2, Users, CheckCircle2, 
  ExternalLink, ArrowRight, ShieldCheck, MapPin 
} from "lucide-react";

export function HomeCareers() {
  const rubiksServices = [
    {
      title: "Talent Sourcing & Staffing",
      description: "Connecting organizations with pre-vetted, interview-ready software engineers, web developers, SDET testers, and data analysts."
    },
    {
      title: "Campus & Drive Recruitment",
      description: "Organizing targeted recruitment drives, institutional campus placements, and candidate technical evaluation rounds."
    },
    {
      title: "IT Consulting & Software Services",
      description: "Delivering bespoke digital applications, AI solutions, web platforms, and technology consulting for business clients."
    },
    {
      title: "Corporate Career Opportunities",
      description: "Assisting qualified learners who complete training programs with career guidance, resume positioning, and employer interview schedules."
    }
  ];

  return (
    <section id="careers" className="py-16 sm:py-24 bg-white dark:bg-[#0B1120] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Hiring & Placement Ecosystem</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight leading-tight">
              Career Support Powered by <br />
              <span className="text-amber-600 dark:text-amber-400">
                RUBIKS Business Solutions
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
              RUBIKS serves as the corporate hiring bridge within our ecosystem. Headquartered at Dabagardens, Visakhapatnam, RUBIKS works with companies to streamline their IT staffing and helps trained students connect with real employment opportunities.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-700 dark:text-[#A8B5C7]">
                  <strong className="text-slate-900 dark:text-[#F1F5F9]">Pre-Vetted Candidate Profiles:</strong> Companies receive candidates whose coding proficiency and architectural skills have been tested in real labs.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-700 dark:text-[#A8B5C7]">
                  <strong className="text-slate-900 dark:text-[#F1F5F9]">Career Preparation & Guidance:</strong> Rigorous resume reviews, algorithmic problem-solving practice, and mock interview feedback.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-700 dark:text-[#A8B5C7]">
                  <strong className="text-slate-900 dark:text-[#F1F5F9]">Direct Industry Alignment:</strong> Training syllabi are routinely coordinated with actual job requirements from recruiting partners.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a
                href="https://rubiksbs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <span>Visit RUBIKS Official Website</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#A8B5C7] font-mono">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Dabagardens, Visakhapatnam</span>
              </div>
            </div>
          </div>

          {/* Right Column: 4 Rubiks Capabilities Grid */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {rubiksServices.map((item, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-amber-500/40 transition duration-300"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-[#F1F5F9] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
