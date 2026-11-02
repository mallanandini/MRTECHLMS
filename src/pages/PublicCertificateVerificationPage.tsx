/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { 
  ShieldCheck, ShieldAlert, Award, Calendar, CheckCircle2, 
  Download, Copy, Check, ArrowLeft, Search, Building2, User, ExternalLink, AlertTriangle, Printer
} from "lucide-react";
import { PublicCertificateVerification } from "../types.js";

export function PublicCertificateVerificationPage() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(routeCode || queryCode || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    status: string;
    verification?: PublicCertificateVerification;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const codeToSearch = routeCode || queryCode;
    if (codeToSearch && codeToSearch.trim()) {
      setInputCode(codeToSearch.trim());
      performVerification(codeToSearch.trim());
    }
  }, [routeCode, queryCode]);

  const performVerification = async (targetCode: string) => {
    if (!targetCode || !targetCode.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(targetCode.trim())}`);
      const data = await res.json();

      if (res.ok && data.verification) {
        setResult({
          valid: data.valid,
          status: data.status,
          verification: data.verification
        });
      } else {
        setResult({
          valid: false,
          status: "not_found",
          error: data.error || "No official credential could be verified matching this identification code."
        });
      }
    } catch (err: any) {
      setResult({
        valid: false,
        status: "error",
        error: "Network error occurred while connecting to the verification service. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      performVerification(inputCode.trim());
    }
  };

  const copyVerificationLink = () => {
    const url = window.location.origin + `/verify-certificate?code=${encodeURIComponent(inputCode.trim())}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadVerifiedPdf = async () => {
    const code = (inputCode || routeCode || queryCode || "").trim();
    if (!code || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code)}/pdf`);
      if (!res.ok) {
        let msg = "Failed to download verified certificate.";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch {}
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${result?.verification?.certificateNumber || code}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
    } catch {
      alert("Network error occurred while downloading official certificate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Brand Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block">
                MRTECH LMS
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 block">
                Official Credential Verification Service
              </span>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col gap-8">
        {/* Hero & Search Form */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Cryptographically Verified Certificates</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Verify an Official Credential
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Confirm the authenticity of course completion and career learning path certifications issued by MR Technologies.
          </p>

          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mt-6">
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/90 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter Certificate ID (e.g. MR-CRS-2026-XXXX) or Verification Code..."
                className="w-full pl-12 pr-32 py-3.5 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="absolute right-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition cursor-pointer"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          </form>
        </div>

        {/* Verification Results Panel */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {result.valid && result.verification ? (
              <div className="bg-slate-800/80 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
                {/* Status Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase font-bold tracking-wider text-emerald-400">
                          Authentic Credential
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                          {result.verification.status}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                        {result.verification.certificateTitle}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 no-print">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-600 transition cursor-pointer shadow-xs"
                      title="Print Certificate"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={downloadVerifiedPdf}
                      disabled={downloading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloading ? "Downloading..." : "Download PDF"}</span>
                    </button>
                    <button
                      onClick={copyVerificationLink}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600 transition cursor-pointer"
                      title="Copy Public Link"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copied" : "Share"}</span>
                    </button>
                  </div>
                </div>

                {/* DEDICATED INDEPENDENT CERTIFICATE DOCUMENT SURFACE */}
                {/* Preserved crisp white canvas with dark, high-contrast typography regardless of surrounding portal theme */}
                <div 
                  className="certificate-document-surface mt-8 bg-white text-slate-900 rounded-2xl p-6 sm:p-12 relative shadow-2xl overflow-hidden select-text"
                  style={{
                    border: "6px double #b45309",
                    backgroundColor: "#ffffff",
                    color: "#0f172a"
                  }}
                >
                  {/* Ornate corner accents */}
                  <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600" />
                  <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600" />
                  <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600" />
                  <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600" />

                  <div className="text-center space-y-4 relative z-10">
                    <div className="text-xs sm:text-sm font-mono uppercase tracking-widest font-bold text-amber-700">
                      {result.verification.organizationName || "MRTECH LEARNING ACADEMY"}
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-wide uppercase text-amber-900">
                      {result.verification.certificateTitle || "CERTIFICATE OF ACHIEVEMENT"}
                    </h2>

                    <p className="text-xs sm:text-sm italic text-slate-600 font-serif">
                      This official credential is hereby verified as awarded to
                    </p>

                    <div className="py-2">
                      <h3 className="text-3xl sm:text-4xl font-serif font-bold text-slate-950 tracking-tight">
                        {result.verification.recipientName}
                      </h3>
                      <div className="w-48 sm:w-64 h-1 bg-amber-600 mx-auto mt-2 rounded-full" />
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 max-w-xl mx-auto leading-relaxed">
                      for successfully fulfilling all curricular standards and demonstrating verified mastery in
                    </p>

                    <div className="text-xl sm:text-2xl font-bold text-slate-950 px-4 py-1">
                      {result.verification.title}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t-2 border-slate-200 text-left">
                      <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-bold block">
                          Certificate ID
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-950 block">
                          {result.verification.certificateNumber}
                        </span>
                      </div>

                      <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-bold block">
                          Date of Issuance
                        </span>
                        <span className="text-xs font-semibold text-slate-950 block">
                          {new Date(result.verification.issuedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </span>
                        <span className="text-[10px] text-slate-600 block">
                          Validity: {result.verification.expiresAt 
                            ? new Date(result.verification.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                            : "Lifetime"}
                        </span>
                      </div>

                      <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-bold block">
                          Authenticated Signatory
                        </span>
                        <span className="text-xs font-serif font-bold text-slate-950 block">
                          {result.verification.signatoryName}
                        </span>
                        <span className="text-[10px] text-slate-600 block">
                          {result.verification.signatoryTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Guarantee Note */}
                <div className="mt-6 flex items-start gap-3 bg-slate-900/50 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 no-print">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300 block mb-0.5">Privacy Protected Verification</span>
                    In compliance with educational privacy protocols, only the verified recipient name, credential title, dates, and official institutional credentials are shown. Personal email and contact records are strictly safeguarded.
                  </div>
                </div>
              </div>
            ) : result.status === "revoked" ? (
              /* REVOKED CERTIFICATE DISPLAY */
              <div className="bg-slate-800/80 border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 uppercase tracking-wider">
                        Revoked Credential
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ID: {result.verification?.certificateNumber}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white">
                      Notice of Credential Revocation
                    </h2>

                    <p className="text-sm text-slate-300">
                      This certificate previously presented to <strong className="text-white">{result.verification?.recipientName}</strong> for <strong className="text-amber-300">{result.verification?.title}</strong> is no longer recognized as valid.
                    </p>

                    {result.verification?.revocationReason && (
                      <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 mt-3">
                        <span className="text-xs font-semibold text-red-300 uppercase block mb-1">
                          Official Revocation Rationale:
                        </span>
                        <p className="text-sm text-red-200">
                          {result.verification.revocationReason}
                        </p>
                        {result.verification.revokedAt && (
                          <span className="text-[11px] text-red-400 block mt-2">
                            Effective Date: {new Date(result.verification.revokedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* NOT FOUND DISPLAY */
              <div className="bg-slate-800/80 border border-amber-500/30 rounded-3xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Credential Verification Failed
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  {result.error || "The identifier you searched does not correspond to any valid, recorded certification. Please double check the code and try again."}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} MR Technologies Learning Academy. All rights reserved. Official Credential Verification System.
      </footer>
    </div>
  );
}
