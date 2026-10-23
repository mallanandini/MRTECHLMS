/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Award, ShieldAlert, ShieldCheck, Download, Search, Filter, 
  RotateCcw, AlertTriangle, Eye, CheckCircle2, Clock, 
  ExternalLink, Layers, X, Sparkles, AlertCircle, Loader2 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Certificate, CertificateTemplate } from "../../types.js";

export function AdminCertificatesPage() {
  const { authToken } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revoked: 0,
    expired: 0,
    courseCount: 0,
    pathCount: 0
  });
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [reissuingCert, setReissuingCert] = useState<Certificate | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Form states
  const [revocationReason, setRevocationReason] = useState("");
  const [reissueMonths, setReissueMonths] = useState("12");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getEffectiveToken = () => {
    const raw = authToken || localStorage.getItem("lms_token") || localStorage.getItem("token") || "";
    if (!raw || raw === "null" || raw === "undefined" || raw.trim() === "") {
      return "";
    }
    return raw.trim();
  };

  useEffect(() => {
    fetchCertificates();
    fetchTemplates();
  }, [authToken, statusFilter, typeFilter]);

  const fetchCertificates = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = getEffectiveToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`/api/admin/certificates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.data) {
        setCertificates(data.data.certificates || []);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err: any) {
      setErrorMessage("Failed to load certificate records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = getEffectiveToken();
      const res = await fetch("/api/admin/certificate-templates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setTemplates(data.data);
      }
    } catch (e) {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCertificates();
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingCert || !revocationReason.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const token = getEffectiveToken();
      const res = await fetch(`/api/admin/certificates/${revokingCert.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: revocationReason.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke certificate.");
      }

      setSuccessMessage(`Certificate ${revokingCert.certificateNumber} has been revoked.`);
      setRevokingCert(null);
      setRevocationReason("");
      await fetchCertificates();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to revoke certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReissueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reissuingCert) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const token = getEffectiveToken();
      const res = await fetch(`/api/admin/certificates/${reissuingCert.id}/reissue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          validityMonths: reissueMonths ? Number(reissueMonths) : undefined,
          reason: "Administrative reissuance and credential reactivation."
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reissue certificate.");
      }

      setSuccessMessage(`Certificate ${reissuingCert.certificateNumber} has been reactivated.`);
      setReissuingCert(null);
      await fetchCertificates();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reissue certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPdf = async (cert: Certificate) => {
    if (downloadingId) return;
    setDownloadingId(cert.id);
    setErrorMessage(null);

    try {
      const token = getEffectiveToken();
      if (!token) {
        throw new Error("Authentication session not found. Please log in again to download certificate.");
      }

      const res = await fetch(`/api/admin/certificates/${cert.id}/pdf`, {
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
      setErrorMessage(err.message || "Failed to download certificate.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500 shrink-0" />
            <span className="truncate">Certificate Management</span>
          </h1>
          <p className="text-sm opacity-70 mt-1">
            Audit, verify, revoke, and manage all student certificates across courses and career paths.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
          >
            <Layers className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Templates ({templates.length})</span>
          </button>

          <a
            href="/verify-certificate"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-xs"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>Public Verification</span>
          </a>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-3 text-sm min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="truncate">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="opacity-70 hover:opacity-100 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between gap-3 text-sm min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="opacity-70 hover:opacity-100 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 min-w-0">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Issued</span>
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2 truncate">{stats.total}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 truncate">{stats.active}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Revoked</span>
            <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2 truncate">{stats.revoked}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Expired</span>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 truncate">{stats.expired}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between min-w-0">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, certificate ID, title..."
            className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-semibold rounded-lg text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-transparent"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full md:w-auto min-w-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer min-w-0"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
            <option value="expired">Expired Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer min-w-0"
          >
            <option value="all">All Types</option>
            <option value="course">Course Certificates</option>
            <option value="learning_path">Learning Path Certificates</option>
          </select>
        </div>
      </div>

      {/* Certificates Data Table */}
      <div className="w-full min-w-0 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden focus:outline-none scrollbar-thin">
          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-mono uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Certificate ID</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Student</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Credential & Type</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Issued / Expires</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Loading certificates...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No certificate records match your search filter.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-mono whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{cert.certificateNumber}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{cert.verificationCode}</div>
                    </td>

                    <td className="py-4 px-4 min-w-[160px]">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{cert.studentName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{cert.studentEmail}</div>
                    </td>

                    <td className="py-4 px-4 min-w-[200px] max-w-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{cert.certificateTitle}</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">{cert.title}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {cert.type === "course" ? "Course" : "Career Path"}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-slate-900 dark:text-slate-100">{new Date(cert.issuedAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Exp: {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : "Lifetime"}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cert.status === "active" ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" :
                        cert.status === "revoked" ? "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50" : "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                      }`}>
                        {cert.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedCert(cert)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => downloadPdf(cert)}
                          disabled={downloadingId !== null}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:cursor-not-allowed"
                          title="Download PDF"
                        >
                          {downloadingId === cert.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500 dark:text-amber-400" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {cert.status === "active" ? (
                          <button
                            onClick={() => {
                              setRevokingCert(cert);
                              setRevocationReason("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 text-[11px] font-semibold transition cursor-pointer"
                            title="Revoke Certificate"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setReissuingCert(cert);
                              setReissueMonths("12");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Reissue / Reactivate"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reissue</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Modal */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-red-500 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Revoke Certificate</h3>
              </div>
              <button onClick={() => setRevokingCert(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>Certificate ID: <strong className="font-mono text-slate-900 dark:text-white">{revokingCert.certificateNumber}</strong></div>
              <div>Recipient: <strong className="text-slate-900 dark:text-white">{revokingCert.studentName}</strong> ({revokingCert.studentEmail})</div>
              <div>Course/Path: <strong className="text-amber-600 dark:text-amber-400">{revokingCert.title}</strong></div>
            </div>

            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-[11px] text-red-700 dark:text-red-300">
              Revoking a certificate invalidates it immediately in the public verification directory and stamps downloaded PDFs with a "REVOKED" watermark.
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Revocation <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="State the audit rationale (e.g. academic integrity violation, administrative re-assessment, etc.)..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokingCert(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !revocationReason.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Revoking..." : "Confirm Revocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reissue Modal */}
      {reissuingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Reissue / Reactivate Certificate</h3>
              </div>
              <button onClick={() => setReissuingCert(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>Certificate ID: <strong className="font-mono text-slate-900 dark:text-white">{reissuingCert.certificateNumber}</strong></div>
              <div>Recipient: <strong className="text-slate-900 dark:text-white">{reissuingCert.studentName}</strong></div>
              <div>Course/Path: <strong className="text-amber-600 dark:text-amber-400">{reissuingCert.title}</strong></div>
            </div>

            <form onSubmit={handleReissueSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Validity Period (Months)
                </label>
                <select
                  value={reissueMonths}
                  onChange={(e) => setReissueMonths(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="0">Lifetime Validity</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReissuingCert(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Reissuing..." : "Reactivate Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-amber-500 dark:text-amber-400">
                <Layers className="w-5 h-5" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Official Certificate Design Templates</h3>
              </div>
              <button onClick={() => setShowTemplatesModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              These pre-calibrated templates define the visual palette, official borders, and typography rendered by the vector PDF generation engine.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map(tmpl => (
                <div 
                  key={tmpl.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{tmpl.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 font-semibold">
                      {tmpl.style}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">{tmpl.description}</p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: tmpl.primaryColor }} />
                    <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: tmpl.accentColor }} />
                    <span className="text-slate-500 dark:text-slate-400 ml-2">Signatory: {tmpl.defaultSignatoryName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Certificate Details Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Certificate Details</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedCert.certificateTitle}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Certificate ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{selectedCert.certificateNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Verification Code:</span>
                <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold">{selectedCert.verificationCode}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Recipient Student:</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{selectedCert.studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Student Email:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedCert.studentEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Program Title:</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{selectedCert.title}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Signatory:</span>
                <span className="text-slate-700 dark:text-slate-200">{selectedCert.signatoryName} ({selectedCert.signatoryTitle})</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Issued On:</span>
                <span className="text-slate-700 dark:text-slate-200">{new Date(selectedCert.issuedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Expiration:</span>
                <span className="text-slate-700 dark:text-slate-200">{selectedCert.expiresAt ? new Date(selectedCert.expiresAt).toLocaleString() : "Lifetime"}</span>
              </div>
            </div>

            {selectedCert.revokedAt && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300 space-y-1">
                <strong>Revocation Notice:</strong>
                <div>Reason: {selectedCert.revocationReason}</div>
                <div>Date: {new Date(selectedCert.revokedAt).toLocaleString()}</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href={`/verify-certificate?code=${selectedCert.verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Public Verification View</span>
              </a>

              <button
                onClick={() => downloadPdf(selectedCert)}
                disabled={downloadingId !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {downloadingId === selectedCert.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
