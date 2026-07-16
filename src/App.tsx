/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  GraduationCap, BookOpen, Clock, Play, Award, 
  ArrowRight, ShieldAlert, CheckCircle2, Star, Sparkles, BookMarked 
} from "lucide-react";
import { User, UserRole, Course } from "./types.js";
import { Sidebar } from "./components/Sidebar.js";
import { CoursePlayer } from "./components/CoursePlayer.js";
import { AssessmentViewer } from "./components/AssessmentViewer.js";
import { CodingPractice } from "./components/CodingPractice.js";
import { BlogPortal } from "./components/BlogPortal.js";
import { TrainerConsole } from "./components/TrainerConsole.js";
import { AdminConsole } from "./components/AdminConsole.js";

export default function App() {
  // Auth and Token management
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("lms_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Tab/Navigation States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [errorMsg, setErrorMsg] = useState("");

  // Portal State Data
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const [myDashboardStats, setMyDashboardStats] = useState<any>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  // Active Lesson and assessment states
  const [activePlayCourseId, setActivePlayCourseId] = useState<string | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);

  // Sign In inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerRole, setRegisterRole] = useState<UserRole>(UserRole.STUDENT);

  // Load user profile on state startup
  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        
        // Match standard tab redirects on login
        if (data.user.role === UserRole.TRAINER) {
          setActiveTab("trainer-dashboard");
        } else if (data.user.role === UserRole.ADMIN) {
          setActiveTab("admin-dashboard");
        } else {
          setActiveTab("dashboard");
        }
        
        loadStudentStats(token);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error("Profile load failed", e);
    }
  };

  const loadStudentStats = async (token: string) => {
    try {
      const res = await fetch("/api/student/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const stats = await res.json();
        setMyDashboardStats(stats);
        const enrolledIds = stats.courseProgress?.map((c: any) => c.courseId) || [];
        setEnrolledCourseIds(enrolledIds);
        
        // Load completed progress
        if (enrolledIds.length > 0) {
          const progressRes = await fetch(`/api/student/courses/${enrolledIds[0]}/progress`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (progressRes.ok) {
            const list = await progressRes.json();
            setCompletedLessonIds(list.filter((p: any) => p.completed).map((p: any) => p.lessonId));
          }
        }
      }
    } catch (e) {
      console.error("Dashboard statistics load failed", e);
    }
  };

  const loadCatalog = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCatalogCourses(data);
      }
    } catch (err) {
      console.error("Catalog load failed", err);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchProfile(authToken);
    }
    loadCatalog();
  }, [authToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("lms_token", data.token);
        setAuthToken(data.token);
        setEmailInput("");
        setPasswordInput("");
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Authentication failed");
      }
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: emailInput,
          password: passwordInput,
          role: registerRole
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("lms_token", data.token);
        setAuthToken(data.token);
        setRegisterName("");
        setEmailInput("");
        setPasswordInput("");
        setIsRegisterMode(false);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Registration failed");
      }
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("lms_token");
    setAuthToken(null);
    setCurrentUser(null);
    setActivePlayCourseId(null);
    setActiveAssessmentId(null);
  };

  // Quick sign-in utility for reviewer convenience
  const handleQuickSignIn = async (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
    setTimeout(() => {
      const form = document.getElementById("auth-form") as HTMLFormElement;
      if (form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }, 50);
  };

  const handleEnrollCourse = async (courseId: string) => {
    if (!authToken) {
      alert("Please sign in or register to enroll in courses.");
      return;
    }
    try {
      const response = await fetch(`/api/student/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        loadStudentStats(authToken);
        alert("Enrolled successfully! Redirecting to syllabus.");
        setActiveTab("dashboard");
      }
    } catch (e) {
      console.error("Enrollment failed", e);
    }
  };

  const handleLessonCompleteChange = async (lessonId: string, completed: boolean) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/student/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ completed })
      });
      if (res.ok) {
        if (completed) {
          setCompletedLessonIds(prev => [...prev, lessonId]);
        } else {
          setCompletedLessonIds(prev => prev.filter(id => id !== lessonId));
        }
        loadStudentStats(authToken); // Refresh percentages
      }
    } catch (e) {
      console.error("Progress save failed", e);
    }
  };

  if (!currentUser || !authToken) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/10 mb-2">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Lumina LMS</h2>
          <p className="mt-1 text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Modern Intelligent Academy</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-8 border border-slate-200/60 rounded-3xl shadow-sm space-y-6">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <form id="auth-form" onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 mt-1.5 transition-all"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 mt-1.5 transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 mt-1.5 transition-all"
                  required
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Account Role Type</label>
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 mt-1.5 bg-slate-50 transition-all text-slate-700"
                  >
                    <option value={UserRole.STUDENT}>Student</option>
                    <option value={UserRole.TRAINER}>Trainer / Instructor</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition duration-150 shadow-md shadow-blue-500/10"
              >
                {isRegisterMode ? "Create Account" : "Sign In to Portal"}
              </button>
            </form>

            <div className="relative text-center py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
              <span className="relative bg-white px-3 text-[10px] text-slate-400 uppercase tracking-widest font-bold">or Quick Access Demo</span>
            </div>

            {/* reviewer direct login buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickSignIn("student@lms.com", "student123")}
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center hover:bg-slate-100 hover:border-slate-200 transition shadow-xs cursor-pointer"
              >
                <p className="text-[10px] font-bold text-blue-600 font-mono uppercase">Student</p>
                <p className="text-[9px] text-gray-400 mt-0.5">student@lms.com</p>
              </button>
              <button
                onClick={() => handleQuickSignIn("trainer@lms.com", "trainer123")}
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center hover:bg-slate-100 hover:border-slate-200 transition shadow-xs cursor-pointer"
              >
                <p className="text-[10px] font-bold text-emerald-600 font-mono uppercase">Trainer</p>
                <p className="text-[9px] text-gray-400 mt-0.5">trainer@lms.com</p>
              </button>
              <button
                onClick={() => handleQuickSignIn("admin@lms.com", "admin123")}
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center hover:bg-slate-100 hover:border-slate-200 transition shadow-xs cursor-pointer"
              >
                <p className="text-[10px] font-bold text-amber-600 font-mono uppercase">Admin</p>
                <p className="text-[9px] text-gray-400 mt-0.5">admin@lms.com</p>
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 font-semibold">
              {isRegisterMode ? "Already have an account?" : "New to the platform?"}{" "}
              <button
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-blue-600 font-bold hover:underline"
              >
                {isRegisterMode ? "Sign In" : "Register"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Dashboard frame
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 overflow-hidden select-text">
      {/* Sidebar Navigation */}
      <Sidebar
        userRole={currentUser.role}
        userName={currentUser.name}
        userEmail={currentUser.email}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActivePlayCourseId(null);
          setActiveAssessmentId(null);
        }}
        onLogout={handleLogout}
      />

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto h-screen flex flex-col">
        {/* If Student is studying a course */}
        {activePlayCourseId ? (
          <div className="flex-1">
            <CoursePlayer
              courseId={activePlayCourseId}
              authToken={authToken}
              onBack={() => {
                setActivePlayCourseId(null);
                loadStudentStats(authToken);
              }}
              onLessonCompleteChange={handleToggleComplete => handleLessonCompleteChange(handleToggleComplete, !completedLessonIds.includes(handleToggleComplete))}
              completedLessons={completedLessonIds}
            />
          </div>
        ) : activeAssessmentId ? (
          /* Assessment Testing Panel */
          <div className="flex-1">
            <AssessmentViewer
              assessmentId={activeAssessmentId}
              authToken={authToken}
              onBack={() => {
                setActiveAssessmentId(null);
                loadStudentStats(authToken);
              }}
              onCompleted={() => {
                setActiveAssessmentId(null);
                loadStudentStats(authToken);
              }}
            />
          </div>
        ) : (
          /* Default dashboard tab panels */
          <div className="p-8 space-y-8 max-w-7xl mx-auto w-full font-sans">
            {/* Header banner */}
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {currentUser.name}!
                </h1>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  Ready to check your academy progress schedule?
                </p>
              </div>
            </div>

            {/* TAB: Student Learning Space */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-in fade-in duration-150">
                {myDashboardStats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300/80 transition duration-150">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Enrolled Courses</p>
                      <p className="mt-2 text-3xl font-extrabold text-slate-900 font-mono">{myDashboardStats.enrolledCount}</p>
                    </div>
                    <div className="p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300/80 transition duration-150">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Completed Courses</p>
                      <p className="mt-2 text-3xl font-extrabold text-slate-900 font-mono">{myDashboardStats.completedCourses}</p>
                    </div>
                    <div className="p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300/80 transition duration-150">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Average Progress</p>
                      <p className="mt-2 text-3xl font-extrabold text-slate-900 font-mono">{myDashboardStats.averageProgress}%</p>
                    </div>
                  </div>
                )}

                {/* List Student's Enrolled courses & status percentage cards */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-slate-800">My Ongoing Courses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {myDashboardStats?.courseProgress?.length > 0 ? (
                      myDashboardStats.courseProgress.map((course: any) => (
                        <div 
                          key={course.courseId} 
                          className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300/80 transition duration-150 flex flex-col h-[320px] justify-between p-5"
                        >
                          <div className="space-y-3">
                            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden relative">
                              <img 
                                src={course.thumbnail} 
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{course.title}</h4>
                          </div>

                          <div className="space-y-3 border-t border-slate-100 pt-3">
                            {/* progress meter */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold font-mono text-slate-500">
                                <span>PROGRESS</span>
                                <span>{course.percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all rounded-full" style={{ width: `${course.percentage}%` }} />
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setActivePlayCourseId(course.courseId);
                                // Launch standard evaluation test if the course is fully completed
                                if (course.percentage >= 80) {
                                  if (confirm("You are over 80% complete! Would you like to attempt the Module Assessment first?")) {
                                    setActiveAssessmentId("assess-1");
                                  }
                                }
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Continue Learning
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-white border border-slate-200/60 rounded-2xl text-slate-400 font-medium space-y-3 shadow-sm">
                        <BookMarked className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300" />
                        <p className="text-sm">You are not enrolled in any learning courses yet.</p>
                        <button
                          onClick={() => setActiveTab("courses")}
                          className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer"
                        >
                          Browse Course Catalogue
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Browse catalog courses */}
            {activeTab === "courses" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <h3 className="font-bold text-lg text-slate-800">Explore Course Catalog</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {catalogCourses.map((course) => {
                    const isEnrolled = enrolledCourseIds.includes(course.id);
                    return (
                      <div 
                        key={course.id} 
                        className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300/80 transition duration-150 flex flex-col h-[400px]"
                      >
                        <div className="h-44 bg-slate-100 relative">
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md absolute left-4 top-4 uppercase tracking-wider font-mono">
                            {course.category}
                          </span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-800 line-clamp-1 text-md tracking-tight">{course.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{course.description}</p>
                            
                            <div className="flex items-center gap-1 text-amber-400 pt-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-bold text-slate-800">{course.rating || 5.0}</span>
                              <span className="text-[10px] text-slate-400">({course.reviewsCount || 0} reviews)</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3 mt-3">
                            {isEnrolled ? (
                              <button
                                onClick={() => {
                                  setActivePlayCourseId(course.id);
                                }}
                                className="w-full bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-200"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Study Course Tracks
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnrollCourse(course.id)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer"
                              >
                                Enroll in Course
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: Coding playground and compiler */}
            {activeTab === "practice" && (
              <div className="animate-in fade-in duration-150">
                <CodingPractice authToken={authToken} />
              </div>
            )}

            {/* TAB: Blog list and comments */}
            {activeTab === "blogs" && (
              <div className="animate-in fade-in duration-150">
                <BlogPortal 
                  authToken={authToken} 
                  userRole={currentUser.role}
                  userId={currentUser.id}
                />
              </div>
            )}

            {/* TAB: Trainer stats console */}
            {activeTab === "trainer-dashboard" && (
              <div className="animate-in fade-in duration-150">
                <TrainerConsole authToken={authToken} />
              </div>
            )}

            {/* TAB: Trainer course builders */}
            {activeTab === "trainer-courses" && (
              <div className="animate-in fade-in duration-150">
                <TrainerConsole authToken={authToken} />
              </div>
            )}

            {/* TAB: Admin Stats system */}
            {activeTab === "admin-dashboard" && (
              <div className="animate-in fade-in duration-150">
                <AdminConsole authToken={authToken} />
              </div>
            )}

            {/* TAB: Admin User list */}
            {activeTab === "admin-users" && (
              <div className="animate-in fade-in duration-150">
                <AdminConsole authToken={authToken} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

