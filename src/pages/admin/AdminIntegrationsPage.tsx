/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Layers, Shield, Key, FileText, Activity, Radio, 
  Webhook, Terminal, Download, Upload, Plus, Check, 
  RotateCcw, AlertTriangle, ExternalLink, Copy, CheckCircle2, 
  XCircle, Trash2, Send, Play, RefreshCw, Lock, Eye, EyeOff, X
} from "lucide-react";
import { useToast } from "../../context/NotificationContext.js";
import { useAuth } from "../../context/AuthContext.js";

type IntegrationTab = 
  | "sso" 
  | "mfa" 
  | "scorm" 
  | "xapi" 
  | "lti" 
  | "webhooks" 
  | "public_api" 
  | "import_export";

export function AdminIntegrationsPage() {
  const toast = useToast();
  const { authToken } = useAuth();
  const [activeTab, setActiveTab] = useState<IntegrationTab>("sso");

  const getEffectiveToken = () => authToken || localStorage.getItem("lms_token") || localStorage.getItem("token");

  // 1. SSO State
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [ssoCapabilities, setSsoCapabilities] = useState<any>(null);
  const [loadingSso, setLoadingSso] = useState(false);
  const [savingSso, setSavingSso] = useState(false);

  // 2. MFA State
  const [mfaSettings, setMfaSettings] = useState<any>(null);
  const [loadingMfa, setLoadingMfa] = useState(false);

  // 3. SCORM State
  const [scormPackages, setScormPackages] = useState<any[]>([]);
  const [loadingScorm, setLoadingScorm] = useState(false);
  const [isAddScormModalOpen, setIsAddScormModalOpen] = useState(false);
  const [newScorm, setNewScorm] = useState({
    title: "",
    version: "SCORM_12",
    entryPoint: "index.html",
    storageDir: "/scorm/course-demo"
  });

  // 4. xAPI State
  const [xapiStatements, setXapiStatements] = useState<any[]>([]);
  const [loadingXapi, setLoadingXapi] = useState(false);

  // 5. LTI State
  const [ltiRegistrations, setLtiRegistrations] = useState<any[]>([]);
  const [loadingLti, setLoadingLti] = useState(false);
  const [isAddLtiModalOpen, setIsAddLtiModalOpen] = useState(false);
  const [newLti, setNewLti] = useState({
    name: "Institutional LMS Deployment",
    issuer: "https://lms.institution.edu",
    clientId: "10000000000001",
    deploymentId: "dep-12345",
    authLoginUrl: "https://lms.institution.edu/api/lti/authorize_redirect",
    authTokensUrl: "https://lms.institution.edu/login/oauth2/token",
    keyJwksUrl: "https://lms.institution.edu/api/lti/security/jwks"
  });

  // 6. Webhooks State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [isAddWebhookModalOpen, setIsAddWebhookModalOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    targetUrl: "",
    subscribedEvents: ["course.completed", "assessment.passed"]
  });
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // 7. Public API State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [availableScopes, setAvailableScopes] = useState<any[]>([]);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    scopes: ["courses:read", "users:read", "reports:read"],
    rateLimitPerMin: 60,
    expiresInDays: 365
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // 8. Import/Export State
  const [selectedEntity, setSelectedEntity] = useState<string>("users");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Load SSO Config
  const fetchSso = async (signal?: AbortSignal) => {
    setLoadingSso(true);
    try {
      const res = await fetch("/api/integrations/sso/config", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSsoConfig(data.config);
        setSsoCapabilities(data.capabilities);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingSso(false);
    }
  };

  // Load MFA Settings
  const fetchMfa = async (signal?: AbortSignal) => {
    setLoadingMfa(true);
    try {
      const res = await fetch("/api/integrations/mfa/settings", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) setMfaSettings(await res.json());
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingMfa(false);
    }
  };

  // Load SCORM Packages
  const fetchScorm = async (signal?: AbortSignal) => {
    setLoadingScorm(true);
    try {
      const res = await fetch("/api/integrations/scorm/packages", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScormPackages(data.packages || []);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingScorm(false);
    }
  };

  // Load xAPI Statements
  const fetchXapi = async (signal?: AbortSignal) => {
    setLoadingXapi(true);
    try {
      const res = await fetch("/api/integrations/xapi/statements?limit=25", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setXapiStatements(data.statements || []);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingXapi(false);
    }
  };

  // Load LTI Registrations
  const fetchLti = async (signal?: AbortSignal) => {
    setLoadingLti(true);
    try {
      const res = await fetch("/api/integrations/lti/registrations", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLtiRegistrations(data.registrations || []);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingLti(false);
    }
  };

  // Load Webhooks
  const fetchWebhooks = async (signal?: AbortSignal) => {
    setLoadingWebhooks(true);
    try {
      const res = await fetch("/api/integrations/webhooks/subscriptions", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.subscriptions || []);
        setWebhookEvents(data.availableEvents || []);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  // Load API Keys
  const fetchApiKeys = async (signal?: AbortSignal) => {
    setLoadingApiKeys(true);
    try {
      const res = await fetch("/api/integrations/api-keys", {
        signal,
        headers: { Authorization: `Bearer ${getEffectiveToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
        setAvailableScopes(data.availableScopes || []);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (activeTab === "sso") fetchSso(signal);
    if (activeTab === "mfa") fetchMfa(signal);
    if (activeTab === "scorm") fetchScorm(signal);
    if (activeTab === "xapi") fetchXapi(signal);
    if (activeTab === "lti") fetchLti(signal);
    if (activeTab === "webhooks") fetchWebhooks(signal);
    if (activeTab === "public_api") fetchApiKeys(signal);

    return () => {
      controller.abort();
    };
  }, [activeTab, authToken]);

  // Handle Save SSO
  const handleSaveSso = async () => {
    if (!ssoConfig) return;
    setSavingSso(true);
    try {
      const res = await fetch("/api/integrations/sso/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: JSON.stringify(ssoConfig)
      });
      if (res.ok) {
        toast.showSuccess("SSO settings saved successfully.");
        fetchSso();
      } else {
        toast.showError("Failed to update SSO settings.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error updating SSO settings.");
    } finally {
      setSavingSso(false);
    }
  };

  // Handle Create SCORM Package
  const handleCreateScorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScorm.title.trim() || !newScorm.entryPoint.trim()) {
      toast.showError("Package title and entry point are required.");
      return;
    }
    try {
      const res = await fetch("/api/integrations/scorm/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: JSON.stringify(newScorm)
      });
      if (res.ok) {
        toast.showSuccess("SCORM package registered successfully.");
        setIsAddScormModalOpen(false);
        setNewScorm({ title: "", version: "SCORM_12", entryPoint: "index.html", storageDir: "/scorm/course-demo" });
        fetchScorm();
      } else {
        const err = await res.json();
        toast.showError(err.error || "Failed to register SCORM package.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error registering SCORM package.");
    }
  };

  // Handle Create LTI Platform
  const handleCreateLti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLti.name.trim() || !newLti.issuer.trim() || !newLti.clientId.trim()) {
      toast.showError("Platform name, issuer, and client ID are required.");
      return;
    }
    try {
      const res = await fetch("/api/integrations/lti/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: JSON.stringify(newLti)
      });
      if (res.ok) {
        toast.showSuccess("LTI platform registered successfully.");
        setIsAddLtiModalOpen(false);
        setNewLti({
          name: "",
          issuer: "",
          clientId: "",
          deploymentId: "",
          authLoginUrl: "",
          authTokensUrl: "",
          keyJwksUrl: ""
        });
        fetchLti();
      } else {
        const err = await res.json();
        toast.showError(err.error || "Failed to register LTI platform.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error registering LTI platform.");
    }
  };

  // Handle Create Webhook
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhook.name.trim() || !newWebhook.targetUrl.trim()) {
      toast.showError("Webhook name and target URL are required.");
      return;
    }
    try {
      const res = await fetch("/api/integrations/webhooks/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: JSON.stringify(newWebhook)
      });
      if (res.ok) {
        toast.showSuccess("Webhook registered.");
        setIsAddWebhookModalOpen(false);
        setNewWebhook({ name: "", targetUrl: "", subscribedEvents: ["course.completed", "assessment.passed"] });
        fetchWebhooks();
      } else {
        toast.showError("Failed to register webhook.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/integrations/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: JSON.stringify(newKeyData)
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSecret(data.secretKey);
        fetchApiKeys();
      } else {
        toast.showError("Failed to generate API Key.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Bulk Import
  const handleExecuteImport = async () => {
    if (!importCsvText.trim()) {
      toast.showError("Please paste or upload CSV content.");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch(`/api/integrations/import-export/import/${selectedEntity}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
          Authorization: `Bearer ${getEffectiveToken()}`
        },
        body: importCsvText
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        toast.showSuccess(`Import complete: ${data.imported} records created.`);
      } else {
        const err = await res.json();
        toast.showError(err.error || "Import failed.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error submitting bulk import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden w-full min-w-0">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-2 text-indigo-300">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              Enterprise Architecture Foundation
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">Enterprise Integrations Hub</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Configurable extension points for SSO, MFA, SCORM, xAPI, LTI 1.3, Webhooks, Public APIs, and Bulk Data ETL.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Platform Engine v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="w-full min-w-0 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 min-w-max" role="tablist">
          {[
            { id: "sso", label: "Single Sign-On (SSO)", icon: Shield },
            { id: "mfa", label: "Multi-Factor (MFA)", icon: Lock },
            { id: "scorm", label: "SCORM Packages", icon: FileText },
            { id: "xapi", label: "xAPI / LRS", icon: Activity },
            { id: "lti", label: "LTI 1.3 Advantage", icon: Radio },
            { id: "webhooks", label: "Webhooks", icon: Webhook },
            { id: "public_api", label: "Public API Keys", icon: Terminal },
            { id: "import_export", label: "Bulk Import / Export", icon: Upload }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id as IntegrationTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 font-semibold text-xs sm:text-sm rounded-xl whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. SSO TAB */}
      {activeTab === "sso" && (
        <div className="space-y-6 w-full min-w-0">
          {/* Unsupported notice banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3 w-full min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">Supported & Unsupported Protocols Notice</span>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                Supported: <strong>SAML 2.0 Web Browser SSO</strong> and <strong>OIDC Core 1.0</strong> (Okta, Microsoft Entra ID, Google Workspace, Ping Identity).<br />
                <span className="text-rose-600 dark:text-rose-400 font-semibold">Unsupported Legacy Protocols:</span> WS-Federation, WS-Trust, CAS, and direct LDAP/AD socket bindings are explicitly not supported.
              </p>
            </div>
          </div>

          {loadingSso ? (
            <div className="text-center py-12 text-slate-500">Loading SSO settings...</div>
          ) : ssoConfig && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full min-w-0">
              {/* Configuration Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 w-full min-w-0">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 min-w-0">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tenant SSO Configuration</h3>
                    <p className="text-xs text-slate-500">Federated identity access for your learners and faculty.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Enable SSO:</span>
                    <button
                      type="button"
                      onClick={() => setSsoConfig({ ...ssoConfig, isEnabled: !ssoConfig.isEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        ssoConfig.isEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ssoConfig.isEnabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SSO Protocol</label>
                  <select
                    value={ssoConfig.providerType}
                    onChange={(e) => setSsoConfig({ ...ssoConfig, providerType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="saml">SAML 2.0 (Okta, Entra ID, Google, Ping)</option>
                    <option value="oidc">OpenID Connect (OIDC / OAuth2 PKCE)</option>
                  </select>
                </div>

                {ssoConfig.providerType === "saml" ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">IdP Entity ID / Issuer URL</label>
                      <input
                        type="text"
                        placeholder="https://sts.windows.net/tenant-id/ or http://www.okta.com/exk..."
                        value={ssoConfig.idpEntityId || ""}
                        onChange={(e) => setSsoConfig({ ...ssoConfig, idpEntityId: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">IdP Single Sign-On URL (HTTP-Redirect)</label>
                      <input
                        type="text"
                        placeholder="https://login.microsoftonline.com/.../saml2"
                        value={ssoConfig.idpSignInUrl || ""}
                        onChange={(e) => setSsoConfig({ ...ssoConfig, idpSignInUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">IdP Public X.509 Certificate (PEM)</label>
                      <textarea
                        rows={3}
                        placeholder="-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----"
                        value={ssoConfig.idpCertificate || ""}
                        onChange={(e) => setSsoConfig({ ...ssoConfig, idpCertificate: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">OIDC Issuer URL</label>
                      <input
                        type="text"
                        placeholder="https://login.microsoftonline.com/tenant-id/v2.0"
                        value={ssoConfig.oidcIssuer || ""}
                        onChange={(e) => setSsoConfig({ ...ssoConfig, oidcIssuer: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">OIDC Client ID</label>
                      <input
                        type="text"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={ssoConfig.oidcClientId || ""}
                        onChange={(e) => setSsoConfig({ ...ssoConfig, oidcClientId: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={handleSaveSso}
                    disabled={savingSso}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {savingSso ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save SSO Settings
                  </button>
                </div>
              </div>

              {/* SP Connection Details for IdP Admin */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 w-full min-w-0">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Service Provider (MRTECHLMS) Connection Details</h3>
                  <p className="text-xs text-slate-500">Provide these URLs to your Corporate IdP Administrator to register the LMS application.</p>
                </div>

                <div className="space-y-3.5 w-full min-w-0">
                  <div className="w-full min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">SP Entity ID / Audience URI</label>
                    <div className="flex items-start justify-between gap-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full min-w-0">
                      <code className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all flex-1 min-w-0 leading-relaxed">
                        {ssoConfig.spEntityId}
                      </code>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(ssoConfig.spEntityId); toast.showSuccess("Copied SP Entity ID!"); }} 
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assertion Consumer Service (ACS) URL</label>
                    <div className="flex items-start justify-between gap-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full min-w-0">
                      <code className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all flex-1 min-w-0 leading-relaxed">
                        {ssoConfig.spAcsUrl}
                      </code>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(ssoConfig.spAcsUrl); toast.showSuccess("Copied ACS URL!"); }} 
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`/api/integrations/sso/metadata/${ssoConfig.organizationId}.xml`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Service Provider SAML Metadata XML
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MFA TAB */}
      {activeTab === "mfa" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 w-full min-w-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Multi-Factor Authentication (MFA) Architecture</h3>
            <p className="text-xs text-slate-500 mt-0.5">Time-based One-Time Passwords (RFC 6238 TOTP) and hashed one-time recovery codes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Standard</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 block mt-1">RFC 6238 TOTP</span>
              <span className="text-xs text-slate-400">HMAC-SHA1, 30s step, 6 digits</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recovery Mechanism</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 block mt-1">8 One-Time Codes</span>
              <span className="text-xs text-slate-400">Hashed with SHA-256 in DB</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Authenticator Support</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 block mt-1">Universal Compatibility</span>
              <span className="text-xs text-slate-400">Google, Microsoft, 1Password, Authy</span>
            </div>
          </div>

          {/* MFA Tester / Current User Status */}
          <div className="p-4 border border-indigo-100 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl space-y-2 w-full min-w-0">
            <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Current Administrator Account MFA State:</h4>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className={`px-2.5 py-0.5 rounded-full font-bold ${mfaSettings?.isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                {mfaSettings?.isEnabled ? "MFA Active & Verified" : "MFA Not Enrolled"}
              </span>
              {mfaSettings?.enrolledAt && (
                <span className="text-slate-500">Enrolled on: {new Date(mfaSettings.enrolledAt).toLocaleDateString()}</span>
              )}
              {mfaSettings?.recoveryCodesRemaining !== undefined && (
                <span className="text-slate-500">Remaining Recovery Codes: {mfaSettings.recoveryCodesRemaining}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SCORM TAB */}
      {activeTab === "scorm" && (
        <div className="space-y-6 w-full min-w-0">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3 w-full min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">SCORM Version Compatibility</span>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                Supported: <strong>SCORM 1.2</strong> and <strong>SCORM 2004 (3rd & 4th Editions)</strong> with bidirectional CMI score and completion tracking.<br />
                <span className="text-rose-600 dark:text-rose-400 font-semibold">Unsupported:</span> Legacy AICC (1993) and draft SCORM 1.0/1.1 packages are not supported.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Registered SCORM Packages</h3>
              <p className="text-xs text-slate-500">Manage third-party e-learning authoring packages (Articulate 360, Adobe Captivate, iSpring).</p>
            </div>
            <button
              onClick={() => setIsAddScormModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Register SCORM Package
            </button>
          </div>

          {/* Packages Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Entry Point</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Uploaded At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scormPackages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No SCORM packages uploaded yet. Click "Register SCORM Package" to add one.
                      </td>
                    </tr>
                  ) : (
                    scormPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{pkg.title}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800">
                            {pkg.version}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{pkg.entryPoint}</td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-600 font-bold uppercase text-[10px]">{pkg.status}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{new Date(pkg.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => toast.showSuccess(`SCORM RTE launch preview ready for ${pkg.title}`)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300"
                          >
                            Launch RTE
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. xAPI / LRS TAB */}
      {activeTab === "xapi" && (
        <div className="space-y-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">xAPI Statements & LRS Stream</h3>
              <p className="text-xs text-slate-500">Live learner activity stream conforming to ADL xAPI 1.0.3 / IEEE specifications.</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch("/api/integrations/xapi/statements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getEffectiveToken()}` },
                    body: JSON.stringify({
                      actor: { mbox: "mailto:admin@mrtechlms.com", name: "Administrator" },
                      verb: { id: "http://adlnet.gov/expapi/verbs/interacted", display: { "en-US": "interacted" } },
                      object: { id: "https://mrtechlms.com/activities/hub-audit", definition: { name: { "en-US": "Enterprise Integrations Hub" } } },
                      result: { success: true, completion: true }
                    })
                  });
                  toast.showSuccess("Sample xAPI statement recorded.");
                  fetchXapi();
                } catch (e) {
                  toast.showError("Failed to record sample statement.");
                }
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Send Test xAPI Statement
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Verb</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {xapiStatements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No statements recorded in LRS yet. Click "Send Test xAPI Statement" to test ingestion.
                      </td>
                    </tr>
                  ) : (
                    xapiStatements.map((st: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {st.actor?.name || st.actor?.mbox}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                            {st.verb?.display?.["en-US"] || st.verb?.id?.split("/").pop()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {st.object?.definition?.name?.["en-US"] || st.object?.id}
                        </td>
                        <td className="py-3 px-4">
                          {st.result?.score?.raw !== undefined ? (
                            <span className="font-bold text-emerald-600">{st.result.score.raw} pts</span>
                          ) : st.result?.completion ? (
                            <span className="text-emerald-600 font-semibold">Completed</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(st.timestamp || Date.now()).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. LTI 1.3 TAB */}
      {activeTab === "lti" && (
        <div className="space-y-6 w-full min-w-0">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3 w-full min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">LTI Standard Notice</span>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                Supported: <strong>LTI 1.3 Advantage</strong> (OIDC 3-legged launch, Deep Linking, AGS grade passback).<br />
                <span className="text-rose-600 dark:text-rose-400 font-semibold">Unsupported:</span> Legacy LTI 1.0, 1.1, and 1.2 are deprecated and rejected for security compliance.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">LTI 1.3 Platform Deployments</h3>
              <p className="text-xs text-slate-500">Connect external institutional learning platforms via 1EdTech LTI 1.3 Advantage standards.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/api/integrations/lti/jwks.json"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Public JWKS
              </a>
              <button
                onClick={() => setIsAddLtiModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Register Platform
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Platform Name</th>
                    <th className="py-3 px-4">Issuer</th>
                    <th className="py-3 px-4">Client ID</th>
                    <th className="py-3 px-4">Deployment ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ltiRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No LTI 1.3 platforms registered yet. Click "Register Platform" to configure an institutional LMS platform.
                      </td>
                    </tr>
                  ) : (
                    ltiRegistrations.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{r.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 truncate max-w-xs">{r.issuer}</td>
                        <td className="py-3 px-4 font-mono">{r.clientId}</td>
                        <td className="py-3 px-4 font-mono">{r.deploymentId}</td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-600 font-bold uppercase text-[10px]">{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. WEBHOOKS TAB */}
      {activeTab === "webhooks" && (
        <div className="space-y-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Outbound Webhooks</h3>
              <p className="text-xs text-slate-500">Real-time HTTP callbacks signed with HMAC-SHA256 signatures with automated retry.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/integrations/webhooks/deliveries?limit=25", {
                      headers: { Authorization: `Bearer ${getEffectiveToken()}` }
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setDeliveryLogs(data.logs || []);
                      setIsLogsModalOpen(true);
                    }
                  } catch (e) {
                    toast.showError("Failed to fetch delivery logs.");
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                View Delivery Logs
              </button>
              <button
                onClick={() => setIsAddWebhookModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Webhook
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Target Endpoint</th>
                    <th className="py-3 px-4">Subscribed Events</th>
                    <th className="py-3 px-4">Signing Secret</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {webhooks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No webhooks configured yet. Click "New Webhook" to register an endpoint.
                      </td>
                    </tr>
                  ) : (
                    webhooks.map((w) => (
                      <tr key={w.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{w.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 truncate max-w-xs">{w.targetUrl}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{w.subscribedEvents?.length || 0} events</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{w.secretKey?.substring(0, 10)}...</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/integrations/webhooks/subscriptions/${w.id}/test`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${getEffectiveToken()}` }
                                });
                                if (res.ok) toast.showSuccess("Test ping sent successfully.");
                                else toast.showError("Failed to deliver test ping.");
                              } catch (e) {
                                toast.showError("Error dispatching test ping.");
                              }
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-200"
                          >
                            Ping Test
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete webhook "${w.name}"?`)) return;
                              await fetch(`/api/integrations/webhooks/subscriptions/${w.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${getEffectiveToken()}` }
                              });
                              toast.showSuccess("Webhook removed.");
                              fetchWebhooks();
                            }}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. PUBLIC API TAB */}
      {activeTab === "public_api" && (
        <div className="space-y-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Public Developer API Keys</h3>
              <p className="text-xs text-slate-500">Access RESTful APIs (`/api/v1/courses`, `/api/v1/users`, `/api/v1/enrollments`, `/api/v1/reports`).</p>
            </div>
            <button
              onClick={() => setIsAddKeyModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Generate API Key
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Key Prefix</th>
                    <th className="py-3 px-4">Scopes</th>
                    <th className="py-3 px-4">Rate Limit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No API keys created yet. Generate a key to connect external ERP/HR systems.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((k) => (
                      <tr key={k.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{k.name}</td>
                        <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">{k.keyPrefix}...</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes?.map((s: string) => (
                              <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">{k.rateLimitPerMin} req/min</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold uppercase ${k.status === "active" ? "text-emerald-600" : "text-rose-600"}`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {k.status === "active" && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Revoke API key "${k.name}"?`)) return;
                                await fetch(`/api/integrations/api-keys/${k.id}/revoke`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${getEffectiveToken()}` }
                                });
                                toast.showSuccess("API key revoked.");
                                fetchApiKeys();
                              }}
                              className="text-rose-600 hover:underline font-semibold"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. BULK IMPORT / EXPORT TAB */}
      {activeTab === "import_export" && (
        <div className="space-y-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Bulk Data Import & Export</h3>
              <p className="text-xs text-slate-500">Download formatted CSV reports or bulk-provision learners and enrollments.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="users">Learners & Faculty (Users)</option>
                <option value="courses">Course Catalog</option>
                <option value="groups">Groups & Cohorts</option>
                <option value="enrollments">Course Enrollments</option>
                <option value="results">Assessment Results</option>
              </select>

              <a
                href={`/api/integrations/import-export/templates/${selectedEntity}`}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Template
              </a>

              <a
                href={`/api/integrations/import-export/export/${selectedEntity}`}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </a>

              {["users", "enrollments"].includes(selectedEntity) && (
                <button
                  onClick={() => {
                    setImportResult(null);
                    setImportCsvText("");
                    setIsImportModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Bulk Import
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm w-full min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">
              Entity Schema Specification: {selectedEntity.toUpperCase()}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Standard RFC 4180 CSV layout with strict validation and transaction rollback on failure.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
              {selectedEntity === "users" && (
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">Columns:</span>
                  name, email, role, jobTitle, departmentName<br /><br />
                  <span className="text-slate-400">Sample:</span><br />
                  Alice Walker, alice.walker@example.com, student, Software Engineer, Engineering
                </div>
              )}
              {selectedEntity === "enrollments" && (
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">Columns:</span>
                  studentEmail, courseTitle, dueDate<br /><br />
                  <span className="text-slate-400">Sample:</span><br />
                  alice.walker@example.com, Introduction to TypeScript, 2026-10-31
                </div>
              )}
              {selectedEntity === "courses" && (
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">Columns:</span>
                  ID, Title, Category, Level, Status, Lessons Count, Total Enrollments, Created At
                </div>
              )}
              {selectedEntity === "groups" && (
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">Columns:</span>
                  ID, Name, Code, Description, Member Count, Created At
                </div>
              )}
              {selectedEntity === "results" && (
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">Columns:</span>
                  Submission ID, Assessment Title, Student Name, Student Email, Score, Percentage, Passed, Attempt #, Time Taken (s), Submitted At
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER SCORM PACKAGE */}
      {isAddScormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Register SCORM Package
              </h3>
              <button onClick={() => setIsAddScormModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateScorm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Package Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workplace Safety & Compliance 2026"
                  value={newScorm.title}
                  onChange={(e) => setNewScorm({ ...newScorm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SCORM Specification</label>
                <select
                  value={newScorm.version}
                  onChange={(e) => setNewScorm({ ...newScorm, version: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="SCORM_12">SCORM 1.2 (cmi.core data model)</option>
                  <option value="SCORM_2004">SCORM 2004 (cmi sequencing & navigation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Entry Point HTML File</label>
                <input
                  type="text"
                  required
                  placeholder="index.html or scormdriver/indexAPI.html"
                  value={newScorm.entryPoint}
                  onChange={(e) => setNewScorm({ ...newScorm, entryPoint: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Storage Directory / S3 Path</label>
                <input
                  type="text"
                  placeholder="/scorm-packages/package-id"
                  value={newScorm.storageDir}
                  onChange={(e) => setNewScorm({ ...newScorm, storageDir: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddScormModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Register Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER LTI PLATFORM */}
      {isAddLtiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600" />
                Register LTI 1.3 LMS Platform
              </h3>
              <button onClick={() => setIsAddLtiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLti} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Platform Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University LMS Deployment"
                  value={newLti.name}
                  onChange={(e) => setNewLti({ ...newLti, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Platform Issuer (iss)</label>
                <input
                  type="url"
                  required
                  placeholder="https://lms.institution.edu"
                  value={newLti.issuer}
                  onChange={(e) => setNewLti({ ...newLti, issuer: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Client ID</label>
                  <input
                    type="text"
                    required
                    placeholder="10000000000001"
                    value={newLti.clientId}
                    onChange={(e) => setNewLti({ ...newLti, clientId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deployment ID</label>
                  <input
                    type="text"
                    required
                    placeholder="dep-12345"
                    value={newLti.deploymentId}
                    onChange={(e) => setNewLti({ ...newLti, deploymentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">OIDC Auth Login URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://lms.institution.edu/api/lti/authorize_redirect"
                  value={newLti.authLoginUrl}
                  onChange={(e) => setNewLti({ ...newLti, authLoginUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Platform Keyset URL (JWKS)</label>
                <input
                  type="url"
                  required
                  placeholder="https://lms.institution.edu/api/lti/security/jwks"
                  value={newLti.keyJwksUrl}
                  onChange={(e) => setNewLti({ ...newLti, keyJwksUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">OAuth2 Access Token URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://lms.institution.edu/login/oauth2/token"
                  value={newLti.authTokensUrl}
                  onChange={(e) => setNewLti({ ...newLti, authTokensUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLtiModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Platform
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE WEBHOOK */}
      {isAddWebhookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Webhook className="w-4 h-4 text-indigo-600" />
                Register Outbound Webhook
              </h3>
              <button onClick={() => setIsAddWebhookModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Webhook Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slack Completion Alerts / HR Portal"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Endpoint URL (HTTPS)</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourcompany.com/webhooks/lms"
                  value={newWebhook.targetUrl}
                  onChange={(e) => setNewWebhook({ ...newWebhook, targetUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Subscribed Events</label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {[
                    "course.completed",
                    "assessment.passed",
                    "user.created",
                    "certificate.issued",
                    "gamification.badge_awarded",
                    "enrollment.assigned"
                  ].map((evt) => (
                    <label key={evt} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={newWebhook.subscribedEvents.includes(evt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhook({ ...newWebhook, subscribedEvents: [...newWebhook.subscribedEvents, evt] });
                          } else {
                            setNewWebhook({ ...newWebhook, subscribedEvents: newWebhook.subscribedEvents.filter(x => x !== evt) });
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-mono">{evt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWebhookModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELIVERY LOGS */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Webhook Delivery Audit Trail</h3>
                <p className="text-xs text-slate-500">Recent outbound webhook HTTP dispatch records.</p>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              {deliveryLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No delivery logs recorded yet. Send a test ping from the webhooks table to generate a log entry.
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryLogs.map((log: any) => (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{log.eventType}</span>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${log.status === "success" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}`}>
                          {log.status} ({log.statusCode || "N/A"})
                        </span>
                      </div>
                      <div className="text-slate-500 flex items-center justify-between text-[11px]">
                        <span>Attempts: {log.attemptCount}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      {log.responseBody && (
                        <pre className="p-2 bg-slate-100 dark:bg-slate-900 rounded font-mono text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto">
                          {log.responseBody.substring(0, 300)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE API KEY (Reveals Secret Once) */}
      {isAddKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            {createdSecret ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-center text-slate-900 dark:text-slate-100">API Key Generated</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold text-center">
                  Copy this key now. For security, it will never be displayed again.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <code className="text-xs font-mono text-slate-900 dark:text-slate-100 flex-1 break-all">
                    {createdSecret}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdSecret); toast.showSuccess("Copied to clipboard!"); }}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setCreatedSecret(null);
                    setIsAddKeyModalOpen(false);
                  }}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Generate Developer API Key</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Key Name / Client</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Workday HR Sync / Okta Scim"
                    value={newKeyData.name}
                    onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rate Limit (req/min)</label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={newKeyData.rateLimitPerMin}
                    onChange={(e) => setNewKeyData({ ...newKeyData, rateLimitPerMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Granted Scopes</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {availableScopes.map((sc) => (
                      <label key={sc.scope} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={newKeyData.scopes.includes(sc.scope)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyData({ ...newKeyData, scopes: [...newKeyData.scopes, sc.scope] });
                            } else {
                              setNewKeyData({ ...newKeyData, scopes: newKeyData.scopes.filter(s => s !== sc.scope) });
                            }
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-mono">{sc.scope}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddKeyModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: BULK CSV IMPORT */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Bulk Import: {selectedEntity.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500">
              Paste standard CSV rows including the header line. Existing duplicates will be skipped.
            </p>

            <textarea
              rows={8}
              placeholder={
                selectedEntity === "users" 
                  ? "name,email,role,jobTitle,departmentName\nAlice Walker,alice@example.com,student,Engineer,Engineering"
                  : selectedEntity === "courses"
                  ? "title,shortDescription,category,level,estimatedHours\nReact Masterclass,Learn modern React,Programming,beginner,10"
                  : "col1,col2,col3\nval1,val2,val3"
              }
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              className="w-full p-3 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />

            {importResult && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Import Summary:</span>
                <span className="text-emerald-600 block">✓ Imported: {importResult.imported} records</span>
                {importResult.failed > 0 && (
                  <span className="text-rose-600 block">✗ Failed/Skipped: {importResult.failed} records</span>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={handleExecuteImport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {importing ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Run Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
