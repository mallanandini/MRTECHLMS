/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, CheckCheck, Trash2, Settings, BookOpen, 
  Award, Clock, AlertTriangle, Megaphone, Compass, ExternalLink 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationItem, NotificationType } from "../types.js";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal.js";
import { useAuth } from "../context/AuthContext.js";

function getNotificationVisuals(type: NotificationType) {
  switch (type) {
    case "course_assigned":
      return { icon: BookOpen, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
    case "learning_path_assigned":
      return { icon: Compass, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" };
    case "assessment_assigned":
      return { icon: Award, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    case "approaching_due_date":
      return { icon: Clock, color: "text-orange-400 bg-orange-500/10 border-orange-500/30" };
    case "overdue_learning":
      return { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
    case "assessment_result":
      return { icon: Award, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    case "certificate_issued":
      return { icon: Award, color: "text-amber-300 bg-amber-400/20 border-amber-400/40" };
    case "certificate_expiring":
      return { icon: Clock, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
    case "course_published":
      return { icon: BookOpen, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
    case "admin_announcement":
    default:
      return { icon: Megaphone, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" };
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function NotificationBell() {
  const { authToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showPreferences, setShowPreferences] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const getToken = () => authToken || localStorage.getItem("mrtechlms_student_token") || localStorage.getItem("mrtechlms_admin_token") || localStorage.getItem("lms_token");

  // Load unread count
  const fetchUnreadCount = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error("Failed to load unread notification count", err);
    }
  };

  // Load notification list
  const fetchNotifications = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const unreadParam = filter === "unread" ? "?unreadOnly=true&limit=30" : "?limit=30";
      const res = await fetch(`/api/notifications${unreadParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const token = getToken();
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = getToken();
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = getToken();
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    // Navigate to action URL if present in data or actionUrl
    const url = notif.data?.actionUrl;
    if (url) {
      navigate(url);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 rounded-xl border border-slate-700/60 hover:bg-slate-800/80 transition text-slate-300 hover:text-white flex items-center justify-center"
        style={{
          backgroundColor: "var(--theme-card, rgba(30, 41, 59, 0.5))"
        }}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-md animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: "var(--theme-card, #1e293b)",
            borderColor: "var(--theme-border, #334155)",
            color: "var(--theme-text, #f8fafc)"
          }}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--theme-border, #334155)" }}>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-800 text-xs flex items-center gap-1 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px]">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowPreferences(true);
                }}
                title="Notification Settings"
                className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-800 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 bg-slate-900/40 border-b flex gap-2" style={{ borderColor: "var(--theme-border, #334155)" }}>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filter === "all" 
                  ? "bg-indigo-600 text-white" 
                  : "opacity-70 hover:opacity-100 hover:bg-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filter === "unread" 
                  ? "bg-indigo-600 text-white" 
                  : "opacity-70 hover:opacity-100 hover:bg-slate-800"
              }`}
            >
              Unread only {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center opacity-60">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-40" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] opacity-70 mt-0.5">We'll alert you on assignments, due dates, and scorecards.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const { icon: Icon, color } = getNotificationVisuals(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex gap-3 items-start cursor-pointer hover:bg-slate-800/50 transition group relative ${
                      !notif.read ? "bg-indigo-500/5" : "opacity-80"
                    }`}
                  >
                    {/* Visual Icon */}
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold truncate ${!notif.read ? "text-white" : "opacity-90"}`}>
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[12px] opacity-70 line-clamp-2 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] opacity-50 font-mono">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                        {notif.data?.actionUrl && (
                          <span className="text-[10px] text-indigo-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons (hover) */}
                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          title="Mark as read"
                          className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        title="Delete notification"
                        className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t bg-slate-900/40 text-center" style={{ borderColor: "var(--theme-border, #334155)" }}>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowPreferences(true);
              }}
              className="text-[11px] font-medium text-indigo-400 hover:underline"
            >
              Configure Notification Preferences
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </div>
  );
}
