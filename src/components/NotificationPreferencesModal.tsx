/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Bell, Mail, Clock, AlertTriangle, Award, BookOpen, Megaphone, Check, Loader2 } from "lucide-react";
import { NotificationPreferences } from "../types.js";
import { useToast } from "../context/NotificationContext.js";
import { useAuth } from "../context/AuthContext.js";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const toast = useToast();
  const { authToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    id: "",
    userId: "",
    emailNotifications: true,
    inAppNotifications: true,
    courseAssigned: true,
    learningPathAssigned: true,
    assessmentAssigned: true,
    dueDateReminders: true,
    overdueAlerts: true,
    assessmentResults: true,
    certificateAlerts: true,
    coursePublished: true,
    announcements: true,
    reminderDaysBefore: "7,3,1",
    createdAt: "",
    updatedAt: ""
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchPrefs = async () => {
      setLoading(true);
      try {
        const token = authToken || localStorage.getItem("mrtechlms_student_token") || localStorage.getItem("mrtechlms_admin_token") || localStorage.getItem("lms_token") || localStorage.getItem("token");
        const res = await fetch("/api/notifications/preferences", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPrefs(data);
        }
      } catch (err) {
        console.error("Failed to load notification preferences", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrefs();
  }, [isOpen, authToken]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = authToken || localStorage.getItem("mrtechlms_student_token") || localStorage.getItem("mrtechlms_admin_token") || localStorage.getItem("lms_token") || localStorage.getItem("token");
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });

      if (!res.ok) {
        throw new Error("Failed to update notification preferences");
      }

      toast.success("Notification preferences saved successfully");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: "var(--theme-card, #1e293b)",
          borderColor: "var(--theme-border, #334155)",
          color: "var(--theme-text, #f8fafc)"
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--theme-border, #334155)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Notification Preferences</h3>
              <p className="text-xs opacity-70">Customize how and when you receive LMS notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading preferences...</p>
            </div>
          ) : (
            <>
              {/* Delivery Channels */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Delivery Channels</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => handleToggle("inAppNotifications")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      prefs.inAppNotifications 
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" 
                        : "border-slate-700/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5" />
                      <div>
                        <div className="text-sm font-semibold">In-App Alerts</div>
                        <div className="text-[11px] opacity-70">Bell icon & popup alerts</div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${prefs.inAppNotifications ? "bg-indigo-500 text-white" : "border border-slate-600"}`}>
                      {prefs.inAppNotifications && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <div 
                    onClick={() => handleToggle("emailNotifications")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      prefs.emailNotifications 
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" 
                        : "border-slate-700/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5" />
                      <div>
                        <div className="text-sm font-semibold">Email Updates</div>
                        <div className="text-[11px] opacity-70">Digest & urgent emails</div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${prefs.emailNotifications ? "bg-indigo-500 text-white" : "border border-slate-600"}`}>
                      {prefs.emailNotifications && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Categories */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Notification Topics</h4>
                <div className="space-y-2">
                  {[
                    { key: "courseAssigned", label: "Course Assignments", desc: "When an instructor or admin assigns a course to you", icon: BookOpen },
                    { key: "learningPathAssigned", label: "Learning Path Assignments", desc: "When structured learning tracks are assigned", icon: BookOpen },
                    { key: "assessmentAssigned", label: "Assessment Assignments", desc: "New quizzes and exams waiting for your submission", icon: Award },
                    { key: "dueDateReminders", label: "Approaching Due Date Reminders", desc: "Alerts 7, 3, and 1 day(s) before deadlines", icon: Clock },
                    { key: "overdueAlerts", label: "Overdue Learning Warnings", desc: "Urgent notices for incomplete overdue assignments", icon: AlertTriangle },
                    { key: "assessmentResults", label: "Assessment Graded Scorecards", desc: "Pass/fail and score notifications on completed exams", icon: Award },
                    { key: "certificateAlerts", label: "Certificates Awarded & Expiry", desc: "When certificates are issued or approaching expiration", icon: Award },
                    { key: "coursePublished", label: "New Course Publications", desc: "Updates when new learning material is added to catalog", icon: BookOpen },
                    { key: "announcements", label: "Organization Announcements", desc: "Crucial administrative broadcasts and advisories", icon: Megaphone },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isChecked = (prefs as any)[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggle(item.key as any)}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/40 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-[11px] opacity-60">{item.desc}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${isChecked ? "bg-indigo-500 text-white" : "border border-slate-600"}`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: "var(--theme-border, #334155)" }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl font-medium border border-slate-700 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-sm rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
