/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Compass, Layers, Clock, Lock, CheckCircle2, 
  ArrowRight, Award, ShieldAlert, Sparkles, AlertCircle, X 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function StudentLearningPathsPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restrictedModalPath, setRestrictedModalPath] = useState<any | null>(null);
  const [unpublishedModalPath, setUnpublishedModalPath] = useState<any | null>(null);

  const fetchPaths = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/student/learning-paths", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to load learning paths");
      const data = await res.json();
      setPaths(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
  }, [authToken]);

  const assignedPaths = paths.filter(p => p.isAssigned);
  const availablePaths = paths.filter(p => !p.isAssigned && !p.isUnpublished);

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-blue-600" />
            <span>Learning Paths</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 font-mono">
            Structured Curriculums, Guided Progression, and Milestone Certifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeQuickControls onOpenPreferences={() => navigate("/student/profile")} />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-medium">Loading your learning journeys...</div>
      ) : (
        <div className="space-y-10">
          {/* SECTION 1: MY ASSIGNED LEARNING PATHS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>My Assigned Paths ({assignedPaths.length})</span>
              </h2>
            </div>

            {assignedPaths.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <Compass className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Learning Paths Assigned Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Your administrator will assign you to tailored learning tracks. Browse the catalog below to explore paths.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedPaths.map(path => {
                  const isCompleted = path.progressPercent === 100 || !!path.completedAt;
                  return (
                    <div
                      key={path.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="h-36 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={path.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"}
                          alt={path.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs ${
                            path.isUnpublished
                              ? "bg-amber-600 text-white"
                              : isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-blue-600 text-white"
                          }`}>
                            {path.isUnpublished ? "In Preparation" : isCompleted ? "Completed" : "In Progress"}
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 left-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/60 text-white backdrop-blur-xs">
                            {path.category}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                            {path.title}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {path.shortDescription || path.description}
                          </p>
                          {path.sourceDetails && (
                            <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                              <span className="font-semibold text-slate-500 dark:text-slate-300">Grant: </span>
                              <span>{path.sourceDetails}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Progression</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{path.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted ? "bg-emerald-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${path.progressPercent || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{path.estimatedDuration || "Flexible"}</span>
                          </span>

                          <button
                            onClick={() => {
                              if (path.isUnpublished) {
                                setUnpublishedModalPath(path);
                              } else {
                                navigate(`/student/learning-path/${path.id}`);
                              }
                            }}
                            className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
                              path.isUnpublished
                                ? "bg-amber-600 hover:bg-amber-700"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            <span>{path.isUnpublished ? "In Preparation" : isCompleted ? "Review Path" : path.progressPercent > 0 ? "Continue" : "Start Learning"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: EXPLORE OTHER LEARNING PATHS (CATALOG & RESTRICTED ACCESS) */}
          {availablePaths.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-slate-500" />
                  <span>Explore Other Learning Paths ({availablePaths.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  These learning tracks require enrollment approval from your administrator.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availablePaths.map(path => (
                  <div
                    key={path.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs opacity-85 hover:opacity-100 transition-all flex flex-col"
                  >
                    <div className="h-36 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={path.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"}
                        alt={path.title}
                        className="w-full h-full object-cover filter grayscale-20"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 text-amber-300 backdrop-blur-xs flex items-center gap-1 shadow-xs">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Restricted</span>
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/60 text-white backdrop-blur-xs">
                          {path.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {path.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {path.shortDescription || path.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{path.estimatedDuration || "Flexible"}</span>
                        </span>
                        <span>{path.difficulty}</span>
                      </div>

                      <button
                        onClick={() => setRestrictedModalPath(path)}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Request Access</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACCESS RESTRICTED MODAL */}
      {restrictedModalPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Course/Learning Path Access Restricted
              </h3>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {restrictedModalPath.title}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Public self-enrollment is disabled for this Learning Path. You must be explicitly assigned by an LMS Administrator to access the curriculum and assessments.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-500 text-left space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">How to get access:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Contact your learning administrator or program coordinator</li>
                <li>Provide your registered student email address</li>
                <li>Once assigned, this learning track will instantly appear under "My Assigned Paths"</li>
              </ul>
            </div>

            <button
              onClick={() => setRestrictedModalPath(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* CURRICULUM UNPUBLISHED / IN PREPARATION MODAL */}
      {unpublishedModalPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Learning Path In Preparation
              </h3>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {unpublishedModalPath.title}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You have been successfully assigned to this Learning Path! However, the curriculum and modules are currently in draft or review mode and have not yet been published by the instructor.
            </p>

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 text-left space-y-1 border border-amber-200/60 dark:border-amber-900/40">
              <p className="font-semibold">Next steps:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Your assignment is active and saved in your student profile</li>
                <li>Once the instructor publishes the curriculum, you can start learning immediately</li>
                <li>Check your notifications or dashboard for status updates</li>
              </ul>
            </div>

            <button
              onClick={() => setUnpublishedModalPath(null)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
