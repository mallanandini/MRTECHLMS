/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, GraduationCap, Code2, Terminal, Sparkles, 
  CheckCircle2, Laptop, Award, ShieldCheck, Play 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { UserRole } from "../../types.js";

interface HomeHeroProps {
  onExplorePrograms: () => void;
}

export function HomeHero({ onExplorePrograms }: HomeHeroProps) {
  const { currentUser, authToken } = useAuth();
  const [activeSnippet, setActiveSnippet] = useState<"java" | "python" | "sdet">("java");

  const getPortalCta = () => {
    if (currentUser && authToken && currentUser.role === UserRole.STUDENT) {
      return { path: "/student/dashboard", label: "Go to Student Dashboard" };
    }
    return { path: "/student/login", label: "Access Learning Portal" };
  };

  const portalCta = getPortalCta();

  return (
    <section id="hero" className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-24 lg:pt-16 lg:pb-32 bg-white dark:bg-[#0B1120]">
      {/* Decorative background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Description & CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            {/* Pill Announcement */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold tracking-wide shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Unified IT Training & Career Ecosystem • Powered by Medha XL & RUBIKS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-[#F1F5F9] leading-[1.12]">
              Learn. Build. <br />
              <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                Get Hired.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-[#A8B5C7] font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              MR Technologies brings together technical training, hands-on software development experience, and enterprise hiring channels powered by Medha XL and RUBIKS. Build industry-ready skills and launch your tech career.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to={portalCta.path}
                id="hero-learning-portal-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:shadow-emerald-900/30 transition duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <GraduationCap className="w-5 h-5 text-emerald-100" />
                <span>{portalCta.label}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <button
                type="button"
                onClick={onExplorePrograms}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-[#111C30] hover:bg-slate-50 dark:hover:bg-[#16243D] text-slate-800 dark:text-[#F1F5F9] font-semibold text-sm border border-slate-200 dark:border-[#263449] shadow-xs hover:shadow-sm transition duration-200 cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Explore Our Programs</span>
              </button>
            </div>

            {/* Ecosystem Trust Badges */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-[#263449] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="space-y-0.5">
                <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F1F5F9]">3,500+</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#A8B5C7]">Trained Learners</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F1F5F9]">100+</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#A8B5C7]">Live Projects</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">RUBIKS</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#A8B5C7]">Hiring Partner</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">Dabagardens</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#A8B5C7]">Visakhapatnam Hub</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Learning Environment Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur-lg opacity-15 dark:opacity-25" />

              {/* Main Visual Terminal / Code Window */}
              <div className="relative bg-[#070D18] border border-[#263449] rounded-2xl shadow-2xl overflow-hidden text-slate-200">
                {/* Window title bar */}
                <div className="bg-[#0B1120] px-4 py-3 border-b border-[#263449] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-xs font-mono text-slate-400 ml-2">MRTECH — Learning Playground</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE LAB</span>
                  </div>
                </div>

                {/* Track Tab Bar */}
                <div className="bg-[#070D18]/90 border-b border-[#263449] px-3 py-1.5 flex items-center gap-1 text-[11px] font-mono">
                  <button
                    type="button"
                    id="terminal-tab-java"
                    onClick={() => setActiveSnippet("java")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeSnippet === "java"
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#111C30]"
                    }`}
                  >
                    Java Spring Boot
                  </button>
                  <button
                    type="button"
                    id="terminal-tab-python"
                    onClick={() => setActiveSnippet("python")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeSnippet === "python"
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#111C30]"
                    }`}
                  >
                    Python with AI
                  </button>
                  <button
                    type="button"
                    id="terminal-tab-sdet"
                    onClick={() => setActiveSnippet("sdet")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeSnippet === "sdet"
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#111C30]"
                    }`}
                  >
                    SDET / Testing
                  </button>
                </div>

                {/* Simulated Code Editor Content */}
                <div id="terminal-code-body" className="p-4 sm:p-5 font-mono text-xs space-y-2 leading-relaxed selection:bg-blue-500/30 min-h-[220px]">
                  {activeSnippet === "java" && (
                    <>
                      <div className="text-slate-500">// Enterprise Java Microservice Architecture</div>
                      <div>
                        <span className="text-amber-400">@RestController</span>
                      </div>
                      <div>
                        <span className="text-amber-400">@RequestMapping</span>(<span className="text-emerald-300">"/api/v1/students"</span>)
                      </div>
                      <div>
                        <span className="text-purple-400">public class</span> <span className="text-yellow-300">EnrollmentController</span> <span className="text-slate-400">{"{"}</span>
                      </div>
                      <div className="pl-4">
                        <span className="text-amber-400">@Autowired</span> <span className="text-purple-400">private</span> <span className="text-blue-300">CourseService</span> courseService;
                      </div>
                      <div className="pl-4 pt-1">
                        <span className="text-amber-400">@PostMapping</span>(<span className="text-emerald-300">"/capstone/submit"</span>)
                      </div>
                      <div className="pl-4">
                        <span className="text-purple-400">public</span> <span className="text-blue-300">ResponseEntity</span>&lt;<span className="text-blue-300">Certificate</span>&gt; complete() <span className="text-slate-400">{"{"}</span>
                      </div>
                      <div className="pl-8 text-slate-300">
                        <span className="text-purple-400">return</span> ResponseEntity.ok(courseService.issueVerifiedCredential());
                      </div>
                      <div className="pl-4 text-slate-400">{"}"}</div>
                      <div className="text-slate-400">{"}"}</div>
                    </>
                  )}

                  {activeSnippet === "python" && (
                    <>
                      <div className="text-slate-500"># Python AI & Machine Learning Pipeline</div>
                      <div>
                        <span className="text-purple-400">import</span> fastapi, sklearn.pipeline <span className="text-purple-400">as</span> pipe
                      </div>
                      <div>
                        <span className="text-blue-300">app</span> = fastapi.FastAPI(title=<span className="text-emerald-300">"MRTECH-AI-Sandbox"</span>)
                      </div>
                      <div className="pt-1">
                        <span className="text-amber-400">@app.post</span>(<span className="text-emerald-300">"/predict/career-path"</span>)
                      </div>
                      <div>
                        <span className="text-purple-400">async def</span> <span className="text-yellow-300">evaluate_profile</span>(skills: <span className="text-blue-300">list</span>[<span className="text-blue-300">str</span>]) -&gt; <span className="text-blue-300">dict</span>:
                      </div>
                      <div className="pl-4 text-slate-300">
                        model = pipe.load_model(<span className="text-emerald-300">"career_predictor.joblib"</span>)
                      </div>
                      <div className="pl-4 text-slate-300">
                        <span className="text-purple-400">return</span> {"{"}
                        <span className="text-emerald-300">"status"</span>: <span className="text-emerald-300">"Job-Ready Engineer"</span>,
                        <span className="text-emerald-300">"accuracy"</span>: <span className="text-yellow-400">0.98</span>
                        {"}"}
                      </div>
                    </>
                  )}

                  {activeSnippet === "sdet" && (
                    <>
                      <div className="text-slate-500">// Automated E2E & Selenium Test Lifecycle</div>
                      <div>
                        <span className="text-blue-300">describe</span>(<span className="text-emerald-300">"MRTECHLMS Learning Portal"</span>, () =&gt; <span className="text-slate-400">{"{"}</span>
                      </div>
                      <div className="pl-4">
                        <span className="text-blue-300">it</span>(<span className="text-emerald-300">"verifies cryptographic certificate generation"</span>, <span className="text-purple-400">async</span> () =&gt; <span className="text-slate-400">{"{"}</span>
                      </div>
                      <div className="pl-8 text-slate-300">
                        <span className="text-purple-400">await</span> page.goto(<span className="text-emerald-300">"/verify-certificate"</span>);
                      </div>
                      <div className="pl-8 text-slate-300">
                        <span className="text-purple-400">await</span> page.fill(<span className="text-emerald-300">"#cert-id"</span>, <span className="text-emerald-300">"MRTECH-JAVA-001"</span>);
                      </div>
                      <div className="pl-8 text-slate-300">
                        expect(<span className="text-purple-400">await</span> page.locator(<span className="text-emerald-300">".status"</span>)).toHaveText(<span className="text-emerald-300">"AUTHENTICATED"</span>);
                      </div>
                      <div className="pl-4 text-slate-400">{"}"});</div>
                      <div className="text-slate-400">{"}"});</div>
                    </>
                  )}
                </div>

                {/* Interactive Status Footer inside code card */}
                <div className="bg-slate-950/90 px-4 py-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span className="font-mono text-[11px]">Assessments: 100% Passed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
                    <Award className="w-3.5 h-3.5" />
                    <span>Official Credential</span>
                  </div>
                </div>
              </div>

              {/* Floating feature badge 1 */}
              <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-xl items-center gap-3 animate-in fade-in duration-300">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Cryptographic Certs</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Publicly verifiable QR/ID</span>
                </div>
              </div>

              {/* Floating feature badge 2 */}
              <div className="hidden sm:flex absolute -top-5 -right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xl items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block">Built-In Code Lab</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">Browser execution sandbox</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
