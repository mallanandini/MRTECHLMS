/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Laptop, Users, Building2, Code2, Award, 
  Briefcase, CheckCircle2, ArrowRight 
} from "lucide-react";

export function HomeServices() {
  const services = [
    {
      title: "Individual & Corporate IT Training",
      description: "Structured, instructor-led training for engineering students, fresh graduates, and working professionals seeking to transition or upskill in enterprise software stacks.",
      icon: Laptop,
      badge: "Training"
    },
    {
      title: "Campus Recruitment Training (CRT)",
      description: "Comprehensive institutional partnerships for colleges. Prepares engineering students with quantitative aptitude, programming mastery, and mock technical interview drills.",
      icon: Users,
      badge: "Academic"
    },
    {
      title: "Enterprise Staffing & Recruitment",
      description: "Powered by RUBIKS Business Solutions. Providing companies with pre-vetted, interview-ready software engineers, QA specialists, and data analysts.",
      icon: Briefcase,
      badge: "Hiring"
    },
    {
      title: "Custom Software & Web Development",
      description: "End-to-end software development services delivering responsive web portals, scalable enterprise APIs, AI integration, and digital transformation solutions.",
      icon: Code2,
      badge: "Development"
    },
    {
      title: "Industry Internship Programs",
      description: "Project-centered internship experiences where candidates build full-stack capstones under mentor supervision, followed by authenticated certification.",
      icon: Award,
      badge: "Internships"
    },
    {
      title: "Curriculum & Assessment Solutions",
      description: "Cloud-hosted LMS evaluation frameworks with auto-graded coding challenges, typing speed assessments, and cryptographically verified credentials.",
      icon: Building2,
      badge: "Enterprise"
    }
  ];

  return (
    <section id="services" className="py-16 sm:py-24 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Enterprise & Academic Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight">
            Comprehensive Services Across Education & Industry
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
            From technical classroom training and university campus recruitment drives to corporate talent acquisition and bespoke software development.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-8 flex flex-col justify-between hover:shadow-lg hover:border-emerald-500/40 transition duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0B1120] text-slate-700 dark:text-[#A8B5C7] border border-slate-200/60 dark:border-[#263449]">
                      {service.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9] mb-2.5">
                    {service.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#263449] flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                  <span>Industry-standard delivery</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
