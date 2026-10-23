/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Bell, Mail, Send, RefreshCw, Clock, AlertTriangle, 
  CheckCircle2, XCircle, Edit2, Play, Users, 
  Layers, Check, Loader2, Megaphone, Info, ShieldCheck, Filter
} from "lucide-react";
import { useToast } from "../../context/NotificationContext.js";
import { NotificationTemplate, EmailQueueItem } from "../../types.js";
import { safeFetchJson } from "../../utils/apiResponse.js";

export function AdminNotificationsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"queue" | "broadcast" | "templates" | "reminders">("queue");

  // Queue State
  const [queueStats, setQueueStats] = useState<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  }>({ pending: 0, processing: 0, sent: 0, failed: 0, total: 0 });
  const [providerName, setProviderName] = useState<string>("mock");
  const [queueItems, setQueueItems] = useState<EmailQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "sent" | "failed">("all");
  const [processingQueue, setProcessingQueue] = useState(false);

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTargetRole, setBroadcastTargetRole] = useState("all");
  const [broadcastDepartmentId, setBroadcastDepartmentId] = useState("");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastPreviewTab, setBroadcastPreviewTab] = useState<"in_app" | "email">("in_app");
  const [broadcasting, setBroadcasting] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Reminders State
  const [runningSweep, setRunningSweep] = useState(false);
  const [lastSweepResult, setLastSweepResult] = useState<any>(null);
  const [previewDeadlines, setPreviewDeadlines] = useState<{ courses: any[]; assessments: any[] }>({
    courses: [],
    assessments: []
  });
  const [loadingPreview, setLoadingPreview] = useState(false);

  // 1. Fetch Email Queue Data
  const fetchQueueData = async () => {
    setLoadingQueue(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/notifications/email-queue", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson(res);
      if (parsed.ok && parsed.data) {
        setQueueStats(parsed.data.stats || { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 });
        setProviderName(parsed.data.provider || "mock");
        setQueueItems(parsed.data.recentItems || []);
      } else {
        console.error("Failed to load email queue:", parsed.error);
      }
    } catch (err: any) {
      console.error("Failed to load email queue", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  // 2. Fetch Templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/notifications/templates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson<NotificationTemplate[]>(res, []);
      if (parsed.ok) {
        setTemplates(parsed.data || []);
      } else {
        console.error("Failed to load templates:", parsed.error);
      }
    } catch (err: any) {
      console.error("Failed to load templates", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 3. Fetch Reminders Preview
  const fetchRemindersPreview = async () => {
    setLoadingPreview(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/reminders/preview", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson(res, { courses: [], assessments: [] });
      if (parsed.ok) {
        setPreviewDeadlines(parsed.data || { courses: [], assessments: [] });
      } else {
        console.error("Failed to load reminders preview:", parsed.error);
      }
    } catch (err: any) {
      console.error("Failed to load reminders preview", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // 4. Fetch Departments for targeting
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/departments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson<any[]>(res, []);
      if (parsed.ok && Array.isArray(parsed.data)) {
        setDepartments(parsed.data.map(d => ({ id: d.id, name: d.name })));
      }
    } catch {
      // departments are optional
    }
  };

  useEffect(() => {
    fetchQueueData();
    fetchTemplates();
    fetchRemindersPreview();
    fetchDepartments();
  }, []);

  // Actions
  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/notifications/email-queue/process", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to process queue");
      }
      if (providerName === "mock") {
        toast.success(`Processed ${parsed.data.processed ?? 0} email(s) via MOCK (Simulated Delivery): ${parsed.data.sent ?? 0} simulated, ${parsed.data.failed ?? 0} failed.`);
      } else {
        toast.success(`Processed ${parsed.data.processed ?? 0} email(s): ${parsed.data.sent ?? 0} sent, ${parsed.data.failed ?? 0} failed.`);
      }
      fetchQueueData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process queue");
    } finally {
      setProcessingQueue(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/notifications/email-queue/retry", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || "Failed to retry emails");
      }
      toast.success(parsed.data.message || `Reset failed emails for retry`);
      fetchQueueData();
    } catch (err: any) {
      toast.error(err.message || "Failed to retry emails");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please provide title and message for announcement");
      return;
    }

    setBroadcasting(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/notifications/announce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          targetRole: broadcastTargetRole,
          targetDepartmentId: broadcastDepartmentId || undefined,
          actionUrl: broadcastActionUrl.trim() || undefined
        })
      });

      const parsed = await safeFetchJson(res);
      if (!parsed.ok) throw new Error(parsed.error || "Broadcast failed");

      toast.success(parsed.data.message || "Announcement broadcasted successfully");
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastActionUrl("");
      fetchQueueData();
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (!editingTemplate.inAppTitleTemplate.trim()) {
      toast.error("In-app title template is required.");
      return;
    }
    if (!editingTemplate.inAppBodyTemplate.trim()) {
      toast.error("In-app body template is required.");
      return;
    }

    setSavingTemplate(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch(`/api/admin/notifications/templates/${editingTemplate.type}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingTemplate.name.trim(),
          description: editingTemplate.description?.trim(),
          inAppTitleTemplate: editingTemplate.inAppTitleTemplate.trim(),
          inAppBodyTemplate: editingTemplate.inAppBodyTemplate.trim(),
          emailSubjectTemplate: editingTemplate.emailSubjectTemplate?.trim(),
          emailBodyTemplate: editingTemplate.emailBodyTemplate?.trim(),
          enabled: editingTemplate.enabled !== false
        })
      });

      const parsed = await safeFetchJson(res);
      if (!parsed.ok) throw new Error(parsed.error || "Failed to save template");

      toast.success(`Template '${editingTemplate.name}' updated successfully`);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRunReminderSweep = async () => {
    setRunningSweep(true);
    try {
      const token = localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/reminders/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await safeFetchJson(res);
      if (!parsed.ok) throw new Error(parsed.error || "Sweep failed");

      if (parsed.data.result) {
        setLastSweepResult(parsed.data.result);
      }
      toast.success(parsed.data.message || "Reminder sweep completed successfully.");
      fetchQueueData();
      fetchRemindersPreview();
    } catch (err: any) {
      toast.error(err.message || "Failed to run reminder sweep");
    } finally {
      setRunningSweep(false);
    }
  };

  const filteredQueueItems = queueItems.filter(item => {
    if (queueFilter === "all") return true;
    return item.status === queueFilter;
  });

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notification & Reminder Center</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage background email queues, automated reminders, broadcast announcements, and notification templates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunReminderSweep}
            disabled={runningSweep}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {runningSweep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Reminder Sweep
          </button>
          <button
            onClick={fetchQueueData}
            title="Refresh Data"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Emails</span>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{queueStats.pending}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Queued for delivery worker</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Sent Emails</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{queueStats.sent}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Successfully dispatched</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Failed Emails</span>
            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{queueStats.failed}</div>
            {queueStats.failed > 0 && (
              <button
                onClick={handleRetryFailed}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Retry All
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Exceeded maximum retries</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Email Provider</span>
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono uppercase text-blue-600 dark:text-blue-400">{providerName}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {providerName === "mock" ? "Safe in-memory log (Dev mode)" : "Connected delivery service"}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: "queue", label: "Email Queue & Delivery", icon: Mail, count: queueStats.pending },
          { id: "broadcast", label: "Broadcast Announcement", icon: Megaphone },
          { id: "templates", label: "Notification Templates", icon: Layers, count: templates.length },
          { id: "reminders", label: "Automated Reminders", icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 flex items-center gap-2 font-medium text-sm transition relative whitespace-nowrap cursor-pointer ${
                isActive ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  {tab.count}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMAIL QUEUE */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {providerName === "mock" && (
            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-blue-700 dark:text-blue-300 font-semibold">Development Mode (MOCK Email Provider Active):</strong>
                {" "}Emails queued by the LMS are safely recorded and processed into MySQL database records. Dispatches are simulated in-memory without initiating external SMTP network traffic. For real production delivery, set <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[11px]">EMAIL_ENABLED=true</code> and configure <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[11px]">SMTP_HOST</code>, <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[11px]">SMTP_PORT</code>, <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[11px]">SMTP_USER</code>, and <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[11px]">SMTP_PASS</code> in <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[11px]">.env</code>.
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                <Filter className="w-3.5 h-3.5" /> Filter by:
              </span>
              {(["all", "pending", "sent", "failed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setQueueFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize font-medium transition cursor-pointer ${
                    queueFilter === f
                      ? "bg-blue-600 text-white font-semibold shadow-2xs"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleProcessQueue}
                disabled={processingQueue || queueStats.pending === 0}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {processingQueue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Process Batch ({queueStats.pending})
              </button>
              {queueStats.failed > 0 && (
                <button
                  onClick={handleRetryFailed}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Failed ({queueStats.failed})
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingQueue ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
                        <span className="text-xs mt-2 block font-medium">Loading email queue...</span>
                      </td>
                    </tr>
                  ) : filteredQueueItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                        No emails match filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQueueItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition text-xs">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{item.recipientEmail}</div>
                          {item.recipientName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.recipientName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate" title={item.subject}>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{item.subject}</span>
                          {item.lastError && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate mt-0.5" title={item.lastError}>
                              Error: {item.lastError}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {item.notificationType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "sent" ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" :
                            item.status === "pending" ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" :
                            item.status === "processing" ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50" :
                            "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {item.attempts} / {item.maxAttempts}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {item.sentAt ? new Date(item.sentAt).toLocaleString() : new Date(item.scheduledAt).toLocaleString()}
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

      {/* TAB 2: BROADCAST ANNOUNCEMENT */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleBroadcast} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Compose Administrative Announcement</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Broadcasts both high-priority in-app alerts and email notifications to targeted users.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled System Maintenance / New Security Training"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Role
                  </label>
                  <select
                    value={broadcastTargetRole}
                    onChange={(e) => setBroadcastTargetRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  >
                    <option value="all">All Organization Users</option>
                    <option value="student">Students / Learners Only</option>
                    <option value="manager">Managers Only</option>
                    <option value="admin">Administrators Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Department
                  </label>
                  <select
                    value={broadcastDepartmentId}
                    onChange={(e) => setBroadcastDepartmentId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  >
                    <option value="">All Departments (Unrestricted)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Action URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /courses or https://external-link"
                    value={broadcastActionUrl}
                    onChange={(e) => setBroadcastActionUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Message Content *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Type the full announcement message here..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={broadcasting}
                className="px-6 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2 shadow-sm shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Dispatch Announcement
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {/* Live Interactive Preview Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Live Announcement Preview
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBroadcastPreviewTab("in_app")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      broadcastPreviewTab === "in_app"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    In-App Bell
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastPreviewTab("email")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      broadcastPreviewTab === "email"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Email View
                  </button>
                </div>
              </div>

              {broadcastPreviewTab === "in_app" ? (
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl border border-indigo-400/30 bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {broadcastTitle || "Announcement Title Preview"}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      </div>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 leading-snug whitespace-pre-line">
                        {broadcastMessage || "Enter announcement title and message to see live learner notification preview..."}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono">Just now</span>
                        {broadcastActionUrl && (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 underline">
                            View Details →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-3 font-sans">
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <div><strong>From:</strong> MRTECH LMS &lt;notifications@mrtechlms.com&gt;</div>
                    <div><strong>Subject:</strong> Announcement: {broadcastTitle || "Preview Subject"}</div>
                    <div>
                      <strong>Target:</strong> {broadcastTargetRole === "all" ? "All Users" : `${broadcastTargetRole.toUpperCase()}s`}
                      {broadcastDepartmentId && ` (${departments.find(d => d.id === broadcastDepartmentId)?.name || 'Department'})`}
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <p className="text-slate-700 dark:text-slate-300">Hello Student,</p>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs whitespace-pre-line">
                      {broadcastMessage || "Announcement body text preview..."}
                    </div>
                    {broadcastActionUrl && (
                      <div className="pt-2">
                        <span className="inline-block px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold">
                          View Details
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Scope Badge */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Delivering to: <strong className="text-slate-700 dark:text-slate-200">
                    {broadcastTargetRole === "all" ? "All Organization Users" : broadcastTargetRole === "student" ? "Students Only" : broadcastTargetRole === "manager" ? "Managers Only" : "Administrators Only"}
                  </strong>
                  {broadcastDepartmentId ? ` in ${departments.find(d => d.id === broadcastDepartmentId)?.name}` : " (All Departments)"}
                </span>
              </div>
            </div>

            {/* Broadcasting Behavior Callout */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Info className="w-4 h-4" />
                <span>Broadcasting Behavior & Guarantees</span>
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                <li>In-App Notifications deliver instantly to learner Notification Bells.</li>
                <li>Email notifications are automatically staged in the database queue.</li>
                <li>Individual learner opt-out preferences are strictly respected.</li>
                <li>Automated 20-second debounce prevents accidental duplicate blasts.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES CONFIGURATION */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Template Name</th>
                  <th className="py-3 px-4">Notification Type</th>
                  <th className="py-3 px-4">Channels</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingTemplates ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
                      <span className="text-xs mt-2 block font-medium">Loading templates...</span>
                    </td>
                  </tr>
                ) : (
                  templates.map((tmpl) => (
                    <tr key={tmpl.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition text-xs">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {tmpl.name}
                        {tmpl.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{tmpl.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        {tmpl.type}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          In-App & Email
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                          tmpl.enabled !== false
                            ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}>
                          {tmpl.enabled !== false ? (
                            <><CheckCircle2 className="w-3 h-3" /> Active</>
                          ) : (
                            <><XCircle className="w-3 h-3" /> Disabled</>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEditingTemplate({ ...tmpl })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 ml-auto text-xs cursor-pointer font-medium"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED REMINDERS */}
      {activeTab === "reminders" && (
        <div className="space-y-6">
          {/* Rules Banner */}
          <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              <span>Configured Reminder Schedule & Deduplication Engine</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              The automated background scheduler runs sweeps for upcoming deadlines and past-due assignments.
              Notifications are strictly deduplicated using cryptographic unique keys recorded in <code>reminder_logs</code>, ensuring learners never receive repeated duplicate reminders for the same date window.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                <div className="font-semibold text-amber-600 dark:text-amber-400">7 Days Before</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Early milestone notice</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                <div className="font-semibold text-orange-600 dark:text-orange-400">3 Days Before</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Approaching alert</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                <div className="font-semibold text-rose-600 dark:text-rose-400">1 Day Before</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Urgent deadline warning</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
                <div className="font-semibold text-red-600 dark:text-red-500">Overdue Learning</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Daily escalated alert</div>
              </div>
            </div>
          </div>

          {/* Last Sweep Result Pill */}
          {lastSweepResult && (
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Last Sweep Report:</strong> {lastSweepResult.processed ?? 0} items evaluated ({lastSweepResult.coursesReminded ?? 0} courses, {lastSweepResult.assessmentsReminded ?? 0} assessments, {lastSweepResult.learningPathsReminded ?? 0} learning paths, {lastSweepResult.overdueAlerts ?? 0} overdue alerts, {lastSweepResult.certReminders ?? 0} cert reminders)
                </span>
              </div>
              <div className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg w-fit">
                {lastSweepResult.skipped ?? 0} skipped · {lastSweepResult.failed ?? 0} failed
              </div>
            </div>
          )}

          {/* Upcoming Deadlines Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Upcoming Active Deadlines (LMS-wide Preview)</h3>
              <button
                onClick={fetchRemindersPreview}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Preview
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Item Title</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Days Left</th>
                    <th className="py-3 px-4">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingPreview ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
                        <span className="mt-2 block font-medium">Loading preview...</span>
                      </td>
                    </tr>
                  ) : previewDeadlines.courses.length === 0 && previewDeadlines.assessments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                        No upcoming deadlines with due dates found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {previewDeadlines.courses.map((c) => (
                        <tr key={`c-${c.id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition text-xs">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{c.courseTitle}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{c.studentName} ({c.studentEmail})</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">{new Date(c.dueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                              c.daysRemaining < 0 ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50" :
                              c.daysRemaining <= 3 ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" :
                              "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}>
                              {c.daysRemaining < 0 ? `${Math.abs(c.daysRemaining)}d OVERDUE` : `${c.daysRemaining}d remaining`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 font-medium">
                              Course
                            </span>
                          </td>
                        </tr>
                      ))}
                      {previewDeadlines.assessments.map((a) => (
                        <tr key={`a-${a.id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition text-xs">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{a.assessmentTitle}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{a.studentName} ({a.studentEmail})</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">{new Date(a.dueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                              a.daysRemaining < 0 ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50" :
                              a.daysRemaining <= 3 ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" :
                              "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}>
                              {a.daysRemaining < 0 ? `${Math.abs(a.daysRemaining)}d OVERDUE` : `${a.daysRemaining}d remaining`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 font-medium">
                              Assessment
                            </span>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Template Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Notification Template</h3>
                <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">{editingTemplate.type}</span>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Template Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Template Status</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    When active, automated notifications using this template will be dispatched to learners.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTemplate({ ...editingTemplate, enabled: editingTemplate.enabled === false })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    editingTemplate.enabled !== false
                      ? "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  {editingTemplate.enabled !== false ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Active</>
                  ) : (
                    <><XCircle className="w-3.5 h-3.5" /> Disabled</>
                  )}
                </button>
              </div>

              {/* Template Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
                />
              </div>

              {/* Template Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingTemplate.description || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* In-App Title Template */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  In-App Title Template *
                </label>
                <input
                  type="text"
                  required
                  value={editingTemplate.inAppTitleTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, inAppTitleTemplate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition"
                />
              </div>

              {/* In-App Message Template */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  In-App Message Template *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingTemplate.inAppBodyTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, inAppBodyTemplate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition"
                />
              </div>

              {/* Email Subject Template */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Email Subject Template
                </label>
                <input
                  type="text"
                  value={editingTemplate.emailSubjectTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, emailSubjectTemplate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition"
                />
              </div>

              {/* Email HTML Body Template */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Email HTML Body Template
                </label>
                <textarea
                  rows={4}
                  value={editingTemplate.emailBodyTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, emailBodyTemplate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition"
                />
              </div>

              {/* Live Rendered Preview */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                  Rendered Preview (Sample Learner Data)
                </span>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-slate-500 font-medium">In-App Title: </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {editingTemplate.inAppTitleTemplate
                        .replace(/\{\{name\}\}/g, "Alex Taylor")
                        .replace(/\{\{title\}\}/g, "Full Stack React Masterclass")
                        .replace(/\{\{dueDate\}\}/g, "2026-10-15")
                        .replace(/\{\{daysRemaining\}\}/g, "3")
                        .replace(/\{\{score\}\}/g, "92")
                        .replace(/\{\{percentage\}\}/g, "92")
                        .replace(/\{\{certificateNumber\}\}/g, "CERT-2026-8841")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">In-App Body: </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {editingTemplate.inAppBodyTemplate
                        .replace(/\{\{name\}\}/g, "Alex Taylor")
                        .replace(/\{\{title\}\}/g, "Full Stack React Masterclass")
                        .replace(/\{\{dueDate\}\}/g, "2026-10-15")
                        .replace(/\{\{daysRemaining\}\}/g, "3")
                        .replace(/\{\{score\}\}/g, "92")
                        .replace(/\{\{percentage\}\}/g, "92")
                        .replace(/\{\{certificateNumber\}\}/g, "CERT-2026-8841")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Available Tags:</strong> <code>{"{{name}}"}</code>, <code>{"{{title}}"}</code>, <code>{"{{dueDate}}"}</code>, <code>{"{{daysRemaining}}"}</code>, <code>{"{{actionUrl}}"}</code>, <code>{"{{score}}"}</code>, <code>{"{{percentage}}"}</code>, <code>{"{{certificateNumber}}"}</code>.
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminNotificationsPage;
