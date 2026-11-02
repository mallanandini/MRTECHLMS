/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Building2, GraduationCap, Briefcase, ExternalLink, 
  CheckCircle2, ArrowRight, ShieldCheck, Sparkles 
} from "lucide-react";

export function HomeAbout() {
  return (
    <section id="about" className="py-16 sm:py-24 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>The MR Technologies Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight">
            Bridging Education, Practical Skills, and Industry Hiring
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
            MR Technologies operates as a collaborative ecosystem bringing together technical training, hands-on software development experience, and enterprise hiring channels. We empower students, job seekers, and working professionals with job-ready technical proficiencies.
          </p>
        </div>

        {/* 3 Pillar Cards: MR Technologies, Medha XL, RUBIKS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1: MR Technologies */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-emerald-500/40 transition duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-950 dark:text-[#F1F5F9]">
                  MR Technologies
                </h3>
                <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/60">
                  Parent Ecosystem
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8B5C7] leading-relaxed mb-6">
                The overarching training and career-development organization based in Visakhapatnam. Oversees curricular governance, student certifications, and overall program excellence.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-[#A8B5C7] mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Integrated multi-track technology learning academy</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>College workshops and Campus Recruitment Training</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Official verifiable course completion credentials</span>
                </li>
              </ul>
            </div>

            <a
              href="https://mrtechinfo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-slate-100 dark:hover:bg-[#16243d] text-slate-900 dark:text-[#F1F5F9] font-semibold text-xs border border-slate-200 dark:border-[#263449] transition shadow-2xs group-hover:border-emerald-500/40"
            >
              <span>Visit Official Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </a>
          </div>

          {/* Pillar 2: Medha XL */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-indigo-500/40 transition duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-950 dark:text-[#F1F5F9]">
                  Medha XL
                </h3>
                <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700/60">
                  Training Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8B5C7] leading-relaxed mb-6">
                The technical training and skill-development specialist powering our practical coursework, live coding labs, tutorials, and project mentorship.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-[#A8B5C7] mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Hands-on Java, Python, Web, and SDET tracks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Real-time capstone project development & code reviews</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Continuous learning support and coding exercises</span>
                </li>
              </ul>
            </div>

            <div className="py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449] text-center flex items-center justify-center gap-2 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Powers all hands-on technical curriculum in MRTECHLMS
              </span>
            </div>
          </div>

          {/* Pillar 3: RUBIKS */}
          <div className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-amber-500/40 transition duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white mb-6 shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-950 dark:text-[#F1F5F9]">
                  RUBIKS
                </h3>
                <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700/60">
                  Hiring & Staffing
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8B5C7] leading-relaxed mb-6">
                Rubiks Business Solutions provides IT recruitment, staffing, consulting, and corporate placement connections to transition skilled learners into professional careers.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-[#A8B5C7] mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Candidate screening, pre-vetting, and company matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>IT staffing, consulting, and custom software delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Corporate placement opportunities and hiring drives</span>
                </li>
              </ul>
            </div>

            <a
              href="https://rubiksbs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] hover:bg-slate-100 dark:hover:bg-[#16243d] text-slate-900 dark:text-[#F1F5F9] font-semibold text-xs border border-slate-200 dark:border-[#263449] transition shadow-2xs group-hover:border-amber-500/40"
            >
              <span>Visit RUBIKS Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
