/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Code2, Database, Terminal, ShieldAlert, Cpu, 
  BarChart3, Layers, GraduationCap, ArrowRight, ExternalLink, 
  Clock, Laptop 
} from "lucide-react";

interface ProgramItem {
  id: string;
  name: string;
  category: "fullstack" | "data_ai" | "testing" | "campus";
  description: string;
  tags: string[];
  duration: string;
  mode: string;
  icon: any;
  featured?: boolean;
}

interface HomeProgramsProps {
  onSelectProgram: (programName: string) => void;
}

export function HomePrograms({ onSelectProgram }: HomeProgramsProps) {
  const [activeTab, setActiveTab] = useState<"all" | "fullstack" | "data_ai" | "testing" | "campus">("all");

  const programs: ProgramItem[] = [
    {
      id: "java-fs",
      name: "Java Full Stack Development",
      category: "fullstack",
      description: "End-to-end enterprise software engineering covering Core Java, Object-Oriented Design, Spring Boot, Hibernate ORM, Microservices architecture, React web frontend, and MySQL database integration.",
      tags: ["Java", "Spring Boot", "Hibernate", "Microservices", "React", "MySQL", "REST APIs"],
      duration: "3 – 4 Months",
      mode: "Classroom & Online",
      icon: Code2,
      featured: true
    },
    {
      id: "python-ai",
      name: "Python with AI",
      category: "data_ai",
      description: "Modern application engineering with Python, Django/FastAPI frameworks, combined with practical Artificial Intelligence, Machine Learning algorithms, and generative AI application integrations.",
      tags: ["Python", "Django", "FastAPI", "Machine Learning", "Generative AI", "REST APIs"],
      duration: "3 Months",
      mode: "Classroom & Online",
      icon: Cpu,
      featured: true
    },
    {
      id: "python-ds",
      name: "Python with Data Science",
      category: "data_ai",
      description: "Mathematical and statistical data modeling, exploratory data analysis with Pandas and NumPy, predictive modeling with Scikit-learn, and production machine learning model workflows.",
      tags: ["Python", "Data Science", "Pandas", "NumPy", "Scikit-Learn", "Predictive Modeling"],
      duration: "3 Months",
      mode: "Classroom & Online",
      icon: Database
    },
    {
      id: "python-analytics",
      name: "Python with Data Analytics",
      category: "data_ai",
      description: "Business analytics engineering utilizing SQL data manipulation, automated Python wrangling scripts, KPI calculation, and interactive visual reporting with Tableau and Power BI.",
      tags: ["Python", "SQL", "Data Wrangling", "Tableau", "Power BI", "KPI Dashboards"],
      duration: "2.5 – 3 Months",
      mode: "Classroom & Online",
      icon: BarChart3
    },
    {
      id: "web-mern",
      name: "Full Stack Web Development",
      category: "fullstack",
      description: "Dynamic cloud-native JavaScript engineering across MongoDB, Express.js, React, Node.js (MERN stack), modern state management, and responsive design systems with Tailwind CSS.",
      tags: ["MongoDB", "Express.js", "React", "Node.js", "Tailwind CSS", "JavaScript/TS"],
      duration: "3 Months",
      mode: "Classroom & Online",
      icon: Layers
    },
    {
      id: "sdet-testing",
      name: "Software Testing & SDET",
      category: "testing",
      description: "Quality assurance lifecycle, robust manual test design, automated browser testing with Selenium WebDriver, API test automation with Postman, Cucumber BDD, and CI/CD test pipelines.",
      tags: ["Manual QA", "Selenium WebDriver", "API Testing", "Postman", "JUnit / TestNG", "BDD"],
      duration: "2.5 – 3 Months",
      mode: "Classroom & Online",
      icon: Terminal
    },
    {
      id: "business-bi",
      name: "Business Analytics & Power BI",
      category: "data_ai",
      description: "Converting complex raw enterprise data into executive intelligence. Master Power BI modeling, DAX formulas, interactive dashboard design, and stakeholder reporting.",
      tags: ["Power BI", "DAX", "Business Analytics", "Data Modeling", "Executive Reports"],
      duration: "2 Months",
      mode: "Classroom & Online",
      icon: BarChart3
    },
    {
      id: "internships",
      name: "Industry Internship Projects",
      category: "campus",
      description: "Structured project internships simulating actual software team sprints. Collaborate with Git/GitHub, participate in design reviews, write unit tests, and deliver capstones.",
      tags: ["Real-time Projects", "Agile / Scrum", "Git Collaboration", "Code Reviews", "Capstone"],
      duration: "1 – 3 Months",
      mode: "In-Person Labs & Hybrid",
      icon: GraduationCap,
      featured: true
    },
    {
      id: "crt-workshops",
      name: "College Workshops & Campus Recruitment Training",
      category: "campus",
      description: "Campus-focused enablement for engineering colleges and degree institutions. Includes quantitative aptitude, logical reasoning, core coding test preparation, and mock interviews.",
      tags: ["Campus Recruitment", "Aptitude Training", "Coding Rounds", "Mock Interviews", "Soft Skills"],
      duration: "Custom / 1 – 4 Wks",
      mode: "On-Campus & Online",
      icon: GraduationCap
    }
  ];

  const filtered = activeTab === "all" 
    ? programs 
    : programs.filter(p => p.category === activeTab);

  return (
    <section id="programs" className="py-16 sm:py-24 bg-white dark:bg-[#0B1120] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Curriculum & Career Tracks</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight">
            Industry-Aligned Training Programs
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
            Curated by experienced technical educators and mapped directly to current industry hiring needs. Every track emphasizes practical coding, architectural fundamentals, and real-world project delivery.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {[
            { id: "all", label: "All Programs" },
            { id: "fullstack", label: "Full Stack Development" },
            { id: "data_ai", label: "Data Science & AI" },
            { id: "testing", label: "Software Testing / SDET" },
            { id: "campus", label: "Internships & Campus CRT" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-[#111C30] text-slate-600 dark:text-[#A8B5C7] hover:bg-slate-200 dark:hover:bg-[#16243d] border border-slate-200 dark:border-[#263449]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((program) => {
            const IconComponent = program.icon;
            return (
              <div
                key={program.id}
                className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#263449] p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-emerald-500/40 transition duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    {program.featured && (
                      <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        Popular Track
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-950 dark:text-[#F1F5F9] group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                    {program.name}
                  </h3>

                  {/* Mode & Duration Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 mb-3 text-[11px] font-medium text-slate-500 dark:text-[#A8B5C7]">
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#0B1120] border border-slate-200/60 dark:border-[#263449] px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{program.duration}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#0B1120] border border-slate-200/60 dark:border-[#263449] px-2 py-0.5 rounded-md">
                      <Laptop className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>{program.mode}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-[#A8B5C7] leading-relaxed mb-5">
                    {program.description}
                  </p>

                  {/* Technology Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {program.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0B1120] text-slate-600 dark:text-[#A8B5C7] border border-slate-200/60 dark:border-[#263449]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectProgram(program.name)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer"
                  >
                    <span>Enquire Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href="https://mrtechinfo.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title="View details on official site"
                  >
                    <span>Official Info</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
