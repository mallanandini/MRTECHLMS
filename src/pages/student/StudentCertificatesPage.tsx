/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Award, Download, ExternalLink, Copy, Check, Eye, ShieldCheck, 
  Sparkles, Calendar, BookOpen, Compass, AlertCircle, X, Loader2, Printer 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Certificate, CertificateStyle } from "../../types.js";

interface EligibleToClaim {
  id: string;
  title: string;
  type: "course" | "learning_path";
  progressPercentage: number;
}

export function StudentCertificatesPage() {
  const { authToken, currentUser } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibleList, setEligibleList] = useState<EligibleToClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getEffectiveToken = () => {
    const raw = authToken || localStorage.getItem("lms_token") || localStorage.getItem("token") || "";
    if (!raw || raw === "null" || raw === "undefined" || raw.trim() === "") {
      return "";
    }
    return raw.trim();
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getEffectiveToken();
      // 1. Fetch earned certificates
      const certsRes = await fetch("/api/student/certificates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const certsData = await certsRes.json();
      const certsList: Certificate[] = Array.isArray(certsData) 
        ? certsData 
        : (certsData.data || []);
      setCertificates(certsList);

      // 2. Fetch student courses to find completed ones eligible for certificates
      const coursesRes = await fetch("/api/student/courses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coursesData = await coursesRes.json();
      const courses: any[] = Array.isArray(coursesData) ? coursesData : (coursesData.data || []);

      const alreadyClaimedCourseIds = new Set(
        certsList.filter(c => c.type === "course" && c.courseId).map(c => c.courseId)
      );

      const claimableCourses: EligibleToClaim[] = [];
      for (const c of courses) {
        if (!alreadyClaimedCourseIds.has(c.id) && c.progressPercentage === 100) {
          claimableCourses.push({
            id: c.id,
            title: c.title,
            type: "course",
            progressPercentage: c.progressPercentage
          });
        }
      }

      // 3. Fetch student learning paths
      const pathsRes = await fetch("/api/student/learning-paths", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pathsData = await pathsRes.json();
      const paths: any[] = Array.isArray(pathsData) ? pathsData : (pathsData.data || []);

      const alreadyClaimedPathIds = new Set(
        certsList.filter(c => c.type === "learning_path" && c.learningPathId).map(c => c.learningPathId)
      );

      const claimablePaths: EligibleToClaim[] = [];
      for (const p of paths) {
        if (!alreadyClaimedPathIds.has(p.id) && (p.progressPercent === 100 || p.isPathCompleted)) {
          claimablePaths.push({
            id: p.id,
            title: p.title,
            type: "learning_path",
            progressPercentage: 100
          });
        }
      }

      setEligibleList([...claimableCourses, ...claimablePaths]);
    } catch (err: any) {
      setError("Failed to load your certificates. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimCertificate = async (item: EligibleToClaim) => {
    setClaimingId(item.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = item.type === "course" 
        ? { type: "course", courseId: item.id }
        : { type: "learning_path", learningPathId: item.id };

      const res = await fetch("/api/student/certificates/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not claim certificate at this time.");
      }

      const newCert: Certificate = (data.data && data.data.certificate) || data.certificate;
      setSuccessMessage(`Congratulations! Your certificate for "${item.title}" has been issued!`);
      setPreviewCert(newCert);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to claim certificate.");
    } finally {
      setClaimingId(null);
    }
  };

  const copyShareLink = (cert: Certificate) => {
    const url = `${window.location.origin}/verify-certificate?code=${cert.verificationCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(cert.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const downloadPdf = async (cert: Certificate) => {
    if (downloadingId) return;
    setDownloadingId(cert.id);
    setError(null);

    try {
      const token = getEffectiveToken();
      if (!token) {
        throw new Error("Authentication session not found. Please log in again to download your certificate.");
      }

      const res = await fetch(`/api/student/certificates/${cert.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        let msg = "Failed to download certificate.";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${cert.certificateNumber || cert.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to download certificate.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStyleTheme = (style: CertificateStyle) => {
    switch (style) {
      case "classic_gold":
        return {
          banner: "from-amber-600 via-amber-700 to-amber-900 border-amber-500/40 text-amber-200",
          border: "#b45309",
          borderLight: "#fde68a",
          accent: "#d97706",
          titleColor: "#92400e",
          bgLight: "#fffbeb"
        };
      case "modern_emerald":
        return {
          banner: "from-emerald-600 via-emerald-700 to-emerald-950 border-emerald-500/40 text-emerald-200",
          border: "#047857",
          borderLight: "#a7f3d0",
          accent: "#10b981",
          titleColor: "#065f46",
          bgLight: "#ecfdf5"
        };
      case "executive_navy":
        return {
          banner: "from-blue-700 via-indigo-900 to-slate-950 border-blue-500/40 text-blue-200",
          border: "#1e3a8a",
          borderLight: "#bfdbfe",
          accent: "#2563eb",
          titleColor: "#1e40af",
          bgLight: "#eff6ff"
        };
      case "tech_violet":
        return {
          banner: "from-purple-600 via-violet-800 to-slate-950 border-purple-500/40 text-purple-200",
          border: "#6d28d9",
          borderLight: "#e9d5ff",
          accent: "#7c3aed",
          titleColor: "#5b21b6",
          bgLight: "#faf5ff"
        };
      default:
        return {
          banner: "from-slate-700 via-slate-800 to-slate-950 border-slate-600 text-slate-200",
          border: "#334155",
          borderLight: "#e2e8f0",
          accent: "#475569",
          titleColor: "#1e293b",
          bgLight: "#f8fafc"
        };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
            <Award className="w-8 h-8 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>My Certificates & Credentials</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            View, share, and download your officially verified course and career pathway certificates.
          </p>
        </div>

        <a
          href="/verify-certificate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition"
        >
          <ExternalLink className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Public Verification Portal</span>
        </a>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 text-sm shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 flex items-center justify-between gap-3 text-sm shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/80 shadow-xs flex items-center gap-4 transition">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{certificates.length}</div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">Earned Certificates</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/80 shadow-xs flex items-center gap-4 transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {certificates.filter(c => c.status === "active").length}
            </div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">Active & Verified</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/80 shadow-xs flex items-center gap-4 transition">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{eligibleList.length}</div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">Ready to Claim</div>
          </div>
        </div>
      </div>

      {/* Section 1: Ready to Claim (if any) */}
      {eligibleList.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-500/15 dark:via-slate-900/60 dark:to-slate-950 border border-amber-500/30 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
            <Sparkles className="w-5 h-5 shrink-0" />
            <h2 className="text-lg font-bold">You've Completed Courses Ready for Certification!</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            You have satisfied all curricular completion requirements. Claim your official verified credentials below:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {eligibleList.map(item => (
              <div 
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    {item.type === "course" ? <BookOpen className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block">
                      {item.type === "course" ? "Course Completed" : "Career Path Completed"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate block">{item.title}</h4>
                  </div>
                </div>

                <button
                  onClick={() => handleClaimCertificate(item)}
                  disabled={claimingId === item.id}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shrink-0 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {claimingId === item.id ? "Issuing..." : "Claim Certificate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Earned Certificates Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <span>Earned Credentials</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-semibold">
            {certificates.length}
          </span>
        </h2>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Loading your credential portfolio...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No Certificates Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Complete all lessons in an enrolled course or learning path to earn your official certified credentials.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map(cert => {
              const theme = getStyleTheme(cert.templateStyle);
              return (
                <div
                  key={cert.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-500/50 transition group flex flex-col justify-between"
                >
                  {/* Header Style Banner */}
                  <div className={`p-5 bg-gradient-to-br ${theme.banner} relative overflow-hidden`}>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="font-mono text-[10px] uppercase font-bold tracking-widest bg-black/40 text-white px-2.5 py-1 rounded-full backdrop-blur-xs">
                        {cert.type === "course" ? "Course Credential" : "Career Path Credential"}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cert.status === "active" ? "bg-emerald-500/30 text-emerald-100 border border-emerald-400/40" :
                        cert.status === "revoked" ? "bg-red-500/40 text-red-100 border border-red-400/40" : "bg-amber-500/30 text-amber-100 border border-amber-400/40"
                      }`}>
                        {cert.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white line-clamp-1 drop-shadow-xs">
                      {cert.certificateTitle}
                    </h3>
                    <p className="text-xs text-white/90 line-clamp-1 mt-0.5 font-medium">
                      {cert.title}
                    </p>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900/90">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Certificate ID:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{cert.certificateNumber}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Issued On:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {new Date(cert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Validity:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Lifetime"}
                        </span>
                      </div>

                      {cert.status === "revoked" && (
                        <div className="mt-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-[11px] text-red-800 dark:text-red-300 font-medium">
                          Revoked: {cert.revocationReason || "Revoked by administration."}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewCert(cert)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyShareLink(cert)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="Copy Verification Link"
                        >
                          {copiedId === cert.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {cert.status !== "revoked" && (
                          <button
                            onClick={() => downloadPdf(cert)}
                            disabled={downloadingId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
                            title="Download Certificate PDF"
                          >
                            {downloadingId === cert.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificate Preview Modal */}
      {previewCert && (() => {
        const modalTheme = getStyleTheme(previewCert.templateStyle);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative space-y-4 my-auto">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 no-print">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm text-white">Official Credential Viewer</span>
                </div>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DEDICATED INDEPENDENT CERTIFICATE DOCUMENT SURFACE */}
              {/* Preserved crisp white/ivory canvas with dark, high-contrast typography regardless of surrounding portal theme */}
              <div 
                className="certificate-document-surface w-full bg-white text-slate-900 rounded-2xl p-6 sm:p-12 relative shadow-xl overflow-hidden select-text"
                style={{
                  border: `6px double ${modalTheme.border}`,
                  backgroundColor: "#ffffff",
                  color: "#0f172a"
                }}
              >
                {/* Decorative Corner Filigrees */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: modalTheme.border }} />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: modalTheme.border }} />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: modalTheme.border }} />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: modalTheme.border }} />

                <div className="text-center space-y-4 relative z-10">
                  {/* Organization Header */}
                  <div 
                    className="text-xs sm:text-sm font-mono uppercase font-bold tracking-widest"
                    style={{ color: modalTheme.accent }}
                  >
                    {previewCert.organizationName || "MRTECH LEARNING ACADEMY"}
                  </div>

                  {/* Main Title */}
                  <h2 
                    className="text-2xl sm:text-4xl font-serif font-black tracking-wide uppercase"
                    style={{ color: modalTheme.titleColor }}
                  >
                    {previewCert.certificateTitle}
                  </h2>

                  <p className="text-xs sm:text-sm italic text-slate-600 font-serif">
                    This official credential is hereby proudly conferred upon
                  </p>

                  {/* Student Name */}
                  <div className="py-2">
                    <h3 className="text-3xl sm:text-4xl font-serif font-bold text-slate-950 tracking-tight">
                      {previewCert.studentName}
                    </h3>
                    <div 
                      className="w-48 sm:w-64 h-1 mx-auto mt-2 rounded-full"
                      style={{ backgroundColor: modalTheme.border }}
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 max-w-xl mx-auto leading-relaxed">
                    for successfully demonstrating comprehensive mastery and fulfilling all required curricular standards in
                  </p>

                  {/* Course / Learning Path Title */}
                  <div className="text-xl sm:text-2xl font-bold text-slate-950 px-4 py-1">
                    {previewCert.title}
                  </div>

                  {/* Verification & Signatory Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t-2 border-slate-200 text-left">
                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-600 font-mono uppercase font-bold block">CERTIFICATE NUMBER</span>
                      <span className="font-mono font-bold text-slate-950 text-xs block">{previewCert.certificateNumber}</span>
                      <span className="text-[10px] text-slate-600 block mt-1">
                        Issued: {new Date(previewCert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <ShieldCheck className="w-7 h-7 text-emerald-600 mb-1" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                        OFFICIALLY VERIFIED
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">MR Technologies Registry</span>
                    </div>

                    <div className="space-y-1 text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-600 font-mono uppercase font-bold block">AUTHORIZED SIGNATORY</span>
                      <span className="font-serif font-bold text-slate-950 text-xs block">{previewCert.signatoryName}</span>
                      <span className="text-[10px] text-slate-600 block">{previewCert.signatoryTitle}</span>
                    </div>
                  </div>

                  {previewCert.status === "revoked" && (
                    <div className="p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-900 font-bold text-xs uppercase tracking-wider">
                      NOTICE: This credential was revoked on {previewCert.revokedAt ? new Date(previewCert.revokedAt).toLocaleDateString() : "official record"} ({previewCert.revocationReason || "Administrative rationale"}).
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar (Not printed) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 no-print">
                <div className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                  <span className="text-slate-400">Verification Code:</span>
                  <span className="text-amber-400 font-bold">{previewCert.verificationCode}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition cursor-pointer shadow-xs"
                    title="Print Certificate"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Print</span>
                  </button>

                  <button
                    onClick={() => copyShareLink(previewCert)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition cursor-pointer shadow-xs"
                  >
                    {copiedId === previewCert.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedId === previewCert.id ? "Link Copied" : "Copy Verification Link"}</span>
                  </button>

                  {previewCert.status !== "revoked" ? (
                    <button
                      onClick={() => downloadPdf(previewCert)}
                      disabled={downloadingId !== null}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {downloadingId === previewCert.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Official PDF</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
                      Certificate Revoked
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
