/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link } from "react-router-dom";
import { 
  Compass, Code2, Laptop, Award, Briefcase, 
  ArrowRight, GraduationCap, CheckCircle2, Lock 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { UserRole } from "../../types.js";

export function HomeJourney() {
  const { currentUser, authToken } = useAuth();

  const getPortalTarget = () => {
    if (currentUser && authToken && currentUser.role === UserRole.STUDENT) {
      return { path: "/student/dashboard", label: "Open Student Dashboard" };
    }
    return { path: "/student/login", label: "Sign In to Learning Portal" };
  };

  const portalTarget = getPortalTarget();

  const steps = [
    {
      number: "01",
      title: "Explore & Align",
      description: "Discover training tracks tailored to your background and career goals, from Java Full Stack and Python AI to Quality Assurance and Data Analytics.",
      icon: Compass
    },
    {
      number: "02",
      title: "Develop Technical Skills",
      description: "Engage with structured curriculum modules, instructor-led architectural lessons, and modern software design patterns.",
      icon: Laptop
    },
    {
      number: "03",
      title: "Hands-on Practice & Projects",
      description: "Implement real code in our interactive browser sandbox, complete daily coding exercises, and build collaborative capstone applications.",
      icon: Code2
    },
    {
      number: "04",
      title: "Assessments & Certification",
      description: "Validate subject mastery with module quizzes and coding evaluations to earn official cryptographically verified completion certificates.",
      icon: Award
    },
    {
      number: "05",
      title: "Career & Interview Preparation",
      description: "Fine-tune resumes, practice in mock technical interview rounds, and connect with hiring opportunities through RUBIKS Business Solutions.",
      icon: Briefcase
    }
  ];

  return (
    <section id="journey" className="py-16 sm:py-24 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Learner Roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight">
            Our 5-Stage Learning Journey
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
            A clear, deliberate path from novice concepts to production software craftsmanship and career readiness.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-16">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-emerald-500/40 transition duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-emerald-600/30 dark:text-emerald-400/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prominent CTA Banner: Already Enrolled? */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-gradient-to-br from-[#0B1120] via-[#111C30] to-[#0B1120] text-white p-8 sm:p-12 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Secure Student Learning Portal</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F1F5F9]">
              Already Enrolled? Sign In to Continue Learning
            </h3>

            <p className="text-sm sm:text-base text-[#A8B5C7] leading-relaxed">
              Enrolled students can log in to access assigned curriculum videos, downloadable resource materials, interactive coding challenges, graded assessment quizzes, and officially issued certificates in accordance with their assigned course permissions.
            </p>

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <Link
                to={portalTarget.path}
                id="journey-student-signin-btn"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <GraduationCap className="w-5 h-5" />
                <span>{portalTarget.label}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <span className="text-xs text-slate-400 font-medium">
                Protected 256-bit authenticated session • 24/7 Portal Access
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
