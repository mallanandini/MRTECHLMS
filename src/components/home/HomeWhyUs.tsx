/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Laptop, Code2, Users, Award, ShieldCheck, 
  Briefcase, Compass, CheckCircle2 
} from "lucide-react";

export function HomeWhyUs() {
  const points = [
    {
      title: "Hands-On Practical Methodology",
      description: "Active programming practice, interactive code playgrounds, and daily lab exercises instead of passive theory lectures.",
      icon: Code2
    },
    {
      title: "Industry-Current Curriculum",
      description: "Continually refined syllabus reflecting current enterprise tech stacks: Java Spring Boot, Python AI, React, Microservices, and modern Cloud.",
      icon: Laptop
    },
    {
      title: "Dedicated Technical Mentorship",
      description: "Guidance from experienced technical instructors who conduct code reviews, architectural walkthroughs, and debugging sessions.",
      icon: Users
    },
    {
      title: "Integrated RUBIKS Hiring Network",
      description: "Direct talent pipeline to Rubiks Business Solutions for recruitment assistance, pre-vetted corporate referrals, and hiring connection support.",
      icon: Briefcase
    },
    {
      title: "Cryptographically Verified Credentials",
      description: "Every earned credential comes with a unique verification code and public certificate verification portal for employers and institutions.",
      icon: ShieldCheck
    },
    {
      title: "Structured Professional Learning Paths",
      description: "Milestone-based roadmaps taking candidates step-by-step from core syntax to complex multi-tier capstone project delivery.",
      icon: Compass
    }
  ];

  return (
    <section id="why-us" className="py-16 sm:py-24 bg-white dark:bg-[#0B1120] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>The MR Technologies Advantage</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight">
            Why Learners & Institutions Choose Us
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
            We focus on authentic technical competence, rigorous problem solving, and real employer connectivity to launch durable software engineering careers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {points.map((pt, idx) => {
            const Icon = pt.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-emerald-500/40 transition duration-300 group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-950 dark:text-[#F1F5F9] mb-2">
                    {pt.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
                    {pt.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#263449] flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" />
                  <span>Verified Advantage</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
