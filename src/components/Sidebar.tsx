/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  BookOpen, GraduationCap, Award, PenSquare, Users, 
  Settings, LogOut, Code, ShieldAlert, User as UserIcon, X, 
  Compass, BarChart3, Medal, Building2, BellRing, Trophy, Layers,
  Search, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Sparkles, ShieldCheck, KeyRound, Lock
} from "lucide-react";
import { UserRole } from "../types.js";
import { useTour } from "../context/TourContext.js";
import { ThemeQuickControls } from "./ThemeQuickControls.js";

export interface SubmenuItem {
  id: string;
  label: string;
  path: string;
  dataTour?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string | number;
  badgeVariant?: "primary" | "accent";
  children?: SubmenuItem[];
  dataTour?: string;
}

export interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
  dataTour?: string;
}

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

const SIDEBAR_COMPACT_KEY = "mrtechlms_sidebar_compact";

export function Sidebar({ 
  userRole, userName, userEmail, userAvatar, activeTab, setActiveTab, onLogout,
  isMobileOpen = false, onMobileClose,
  isCompact: externalCompact, onToggleCompact: externalToggleCompact
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { startTour, expandedSubmenuRequest, clearSubmenuRequest } = useTour();

  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  // Compact sidebar state for desktop (persisted in localStorage, disabled for Admin Portal)
  const [internalCompact, setInternalCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COMPACT_KEY) === "true";
    } catch {
      return false;
    }
  });

  const effectiveCompact = isAdmin ? false : (externalCompact !== undefined ? externalCompact : internalCompact);
  const desktopWidth = isAdmin ? "280px" : (effectiveCompact ? "72px" : "260px");

  const toggleCompact = () => {
    if (isAdmin) return; // Fixed width on desktop for Admin Portal
    if (externalToggleCompact) {
      externalToggleCompact();
    } else {
      const next = !internalCompact;
      setInternalCompact(next);
      try {
        localStorage.setItem(SIDEBAR_COMPACT_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
    }
  };

  // Search filter query state
  const [searchQuery, setSearchQuery] = useState("");

  // Submenu expansion state
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});

  // Menu Groups definition
  const menuGroups = useMemo<MenuGroup[]>(() => {
    switch (userRole) {
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return [
          {
            id: "dashboard-group",
            title: "DASHBOARD",
            dataTour: "admin-dashboard",
            items: [
              { id: "admin-dashboard", label: "Dashboard", icon: ShieldAlert, path: "/admin/dashboard" },
            ],
          },
          {
            id: "academic-management",
            title: "ACADEMIC MANAGEMENT",
            dataTour: "admin-academic",
            items: [
              {
                id: "courses",
                label: "Courses",
                icon: BookOpen,
                dataTour: "admin-courses",
                children: [
                  { id: "courses-all", label: "All Courses", path: "/admin/courses" },
                  { id: "courses-new", label: "Create New Course", path: "/admin/courses?action=new" },
                  { id: "courses-content", label: "Course Content & Assessments", path: "/admin/courses?action=content" },
                ],
              },
              {
                id: "access",
                label: "Course Access",
                icon: Lock,
                dataTour: "admin-access",
                children: [
                  { id: "access-assign", label: "Assign Course Access", path: "/admin/access?view=assign" },
                  { id: "access-students", label: "Student Course Access", path: "/admin/access?view=students" },
                  { id: "access-batches", label: "Batch Course Access", path: "/admin/access?view=batches" },
                  { id: "access-revocations", label: "Access History & Revocations", path: "/admin/access?view=revocations" },
                ],
              },
              {
                id: "users-batches",
                label: "Users & Batches",
                icon: Users,
                dataTour: "admin-users-batches",
                children: [
                  { id: "users-manage", label: "Manage Users", path: "/admin/users" },
                  { id: "users-directory", label: "User Directory", path: "/admin/users?view=directory" },
                  { id: "batches-manage", label: "Manage Batches", path: "/admin/batches" },
                ],
              },
              {
                id: "assessments",
                label: "Assessments",
                icon: Award,
                path: "/admin/assessments",
                dataTour: "admin-assessments",
              },
            ],
          },
          {
            id: "monitoring-configuration",
            title: "MONITORING & CONFIGURATION",
            dataTour: "admin-monitoring",
            items: [
              { id: "analytics", label: "Reports", icon: BarChart3, path: "/admin/analytics" },
              { id: "settings", label: "Settings", icon: Settings, path: "/admin/organization", dataTour: "admin-settings" },
            ],
          },
        ];

      case UserRole.MANAGER:
        return [
          {
            id: "workspace",
            title: "WORKSPACE",
            items: [
              { id: "manager-team", label: "Team Dashboard", icon: Users, path: "/manager/team" },
              { id: "manager-analytics", label: "Team Analytics", icon: BarChart3, path: "/manager/analytics" },
            ],
          },
          {
            id: "learning",
            title: "LEARNING & EVALUATION",
            items: [
              { id: "manager-progress", label: "Course Progress", icon: BookOpen, path: "/manager/progress" },
              { id: "manager-assessments", label: "Assessment Results", icon: Award, path: "/manager/assessments" },
              { id: "manager-certificates", label: "Certificates", icon: Medal, path: "/manager/certificates" },
            ],
          },
          {
            id: "account",
            title: "ACCOUNT",
            items: [
              { id: "profile", label: "Preferences & Profile", icon: Settings, path: "/manager/profile" },
            ],
          },
        ];

      case UserRole.STUDENT:
      default:
        return [
          {
            id: "learning",
            title: "MY LEARNING",
            dataTour: "student-dashboard",
            items: [
              { id: "dashboard", label: "Dashboard", icon: GraduationCap, path: "/student/dashboard" },
              { id: "courses", label: "My Courses", icon: BookOpen, path: "/student/courses", dataTour: "student-courses" },
            ],
          },
          {
            id: "practice",
            title: "PRACTICE & CHALLENGES",
            dataTour: "student-practice",
            items: [
              { id: "practice", label: "Coding Practice Arena", icon: Code, path: "/student/coding-practice" },
            ],
          },
          {
            id: "assessments",
            title: "ASSESSMENTS & CERTS",
            dataTour: "student-assessments",
            items: [
              { id: "assessments", label: "My Assessments", icon: Award, path: "/student/assessments" },
              { id: "certificates", label: "My Certificates", icon: Medal, path: "/student/certificates", dataTour: "student-certificates" },
            ],
          },
          {
            id: "community",
            title: "COMMUNITY & RANKS",
            dataTour: "student-gamification",
            items: [
              {
                id: "gamification",
                label: "Achievements & Ranks",
                icon: Trophy,
                children: [
                  { id: "gamification-overview", label: "Overview & XP", path: "/student/gamification" },
                  { id: "gamification-leaderboard", label: "Leaderboard", path: "/student/leaderboard" },
                  { id: "gamification-badges", label: "Badges Earned", path: "/student/badges" },
                ],
              },
              { id: "blogs", label: "Blog Community", icon: PenSquare, path: "/student/blogs" },
            ],
          },
          {
            id: "account",
            title: "ACCOUNT SETTINGS",
            dataTour: "student-profile",
            items: [
              { id: "profile", label: "Preferences & Profile", icon: UserIcon, path: "/student/profile" },
            ],
          },
        ];
    }
  }, [userRole]);

  // Check if a path is active
  const isPathActive = (path?: string) => {
    if (!path) return false;
    const currentPathname = location.pathname;
    const currentParams = new URLSearchParams(location.search);

    const [targetPathname, targetSearchStr] = path.split("?");
    const targetParams = targetSearchStr ? new URLSearchParams(targetSearchStr) : null;

    // Check base pathname match or special prefix exceptions
    let pathnameMatches = currentPathname === targetPathname;

    if (!pathnameMatches) {
      // Prefix exceptions for nested detail views
      if (path === "/student/assessments" && currentPathname.startsWith("/student/assessment")) {
        pathnameMatches = true;
      } else if (path === "/student/coding-practice" && currentPathname.startsWith("/student/coding-practice")) {
        pathnameMatches = true;
      } else if (path === "/student/courses" && (currentPathname.startsWith("/student/course/") || currentPathname.startsWith("/student/courses/"))) {
        pathnameMatches = true;
      } else if (path === "/admin/batches" && currentPathname.startsWith("/admin/batches")) {
        pathnameMatches = true;
      } else if (path === "/admin/users" && currentPathname.startsWith("/admin/users/") && !path.includes("?")) {
        pathnameMatches = true;
      } else if (path === "/admin/assessments" && (currentPathname.startsWith("/admin/assessments") || currentPathname.startsWith("/admin/assessment-results") || currentPathname.startsWith("/admin/results"))) {
        pathnameMatches = true;
      } else if (path === "/admin/organization" && (currentPathname === "/admin/organization" || currentPathname === "/admin/settings" || currentPathname === "/admin/profile")) {
        pathnameMatches = true;
      }
    }

    if (!pathnameMatches) return false;

    // If target specifies query params (e.g. ?action=new, ?action=content, ?view=assign, ?view=directory)
    if (targetParams && targetParams.size > 0) {
      for (const [key, val] of targetParams.entries()) {
        const currentVal = currentParams.get(key);
        // Special case: /admin/access?view=assign is the default view when on /admin/access without view param
        if (targetPathname === "/admin/access" && key === "view" && val === "assign" && !currentVal) {
          continue;
        }
        if (currentVal !== val) {
          return false;
        }
      }
      return true;
    }

    // Target does NOT specify query params (e.g. "/admin/courses", "/admin/users", "/admin/access").
    // If the base route has sibling actions/views, ensure those action/view params are not present!
    if (targetPathname === "/admin/courses") {
      const action = currentParams.get("action");
      if (action === "new" || action === "content") {
        return false;
      }
      return true;
    }

    if (targetPathname === "/admin/users") {
      const view = currentParams.get("view");
      if (view === "directory") {
        return false;
      }
      return true;
    }

    if (targetPathname === "/admin/access") {
      const view = currentParams.get("view");
      if (view && view !== "assign") {
        return false;
      }
      return true;
    }

    if (targetPathname === "/admin/assessments") {
      return !location.search;
    }

    // Default for paths without query parameters
    return true;
  };

  // Check if any child of a menu item is active
  const isParentItemActive = (item: MenuItem) => {
    if (item.path && isPathActive(item.path)) return true;
    if (item.children) {
      return item.children.some(child => {
        if (isPathActive(child.path)) return true;
        const childBase = child.path.split("?")[0];
        return location.pathname === childBase;
      });
    }
    return false;
  };

  // Auto-expand submenus if active child is present on mount or route change
  useEffect(() => {
    const toExpand: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.children && item.children.some(child => {
          if (isPathActive(child.path)) return true;
          const childBase = child.path.split("?")[0];
          return location.pathname === childBase;
        })) {
          toExpand[item.id] = true;
        }
      });
    });
    if (Object.keys(toExpand).length > 0) {
      setExpandedSubmenus(prev => ({ ...prev, ...toExpand }));
    }
  }, [location.pathname, location.search, menuGroups]);

  // Handle auto-expand request from Tour
  useEffect(() => {
    if (expandedSubmenuRequest) {
      setExpandedSubmenus(prev => ({ ...prev, [expandedSubmenuRequest]: true }));
      clearSubmenuRequest();
    }
  }, [expandedSubmenuRequest, clearSubmenuRequest]);

  const toggleSubmenu = (itemId: string) => {
    setExpandedSubmenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleNavigate = (path: string, itemId?: string) => {
    navigate(path);
    if (setActiveTab && itemId) {
      setActiveTab(itemId);
    }
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Filter groups and items based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return menuGroups;

    return menuGroups
      .map(group => {
        // Check if group title matches
        const groupMatches = group.title.toLowerCase().includes(q);

        const matchingItems = group.items.filter(item => {
          const itemMatches = item.label.toLowerCase().includes(q);
          const childMatches = item.children?.some(c => c.label.toLowerCase().includes(q));
          return itemMatches || childMatches || groupMatches;
        });

        if (matchingItems.length > 0) {
          return { ...group, items: matchingItems };
        }
        return null;
      })
      .filter((g): g is MenuGroup => g !== null);
  }, [menuGroups, searchQuery]);

  // When searching, auto-expand any item with children so matches are visible
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const autoExpanded: Record<string, boolean> = {};
      filteredGroups.forEach(group => {
        group.items.forEach(item => {
          if (item.children) {
            autoExpanded[item.id] = true;
          }
        });
      });
      setExpandedSubmenus(prev => ({ ...prev, ...autoExpanded }));
    }
  }, [searchQuery, filteredGroups]);

  // Helper to render Menu List
  const renderNavContent = (compactView: boolean) => (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search Input Bar (Shown in full mode or expandable) */}
      {!compactView ? (
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div 
            style={{ 
              backgroundColor: "var(--theme-sidebar-card)", 
              borderColor: "var(--theme-sidebar-border)" 
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border focus-within:ring-2 focus-within:ring-[var(--theme-primary)] transition"
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-[var(--theme-sidebar-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a page..."
              style={{ color: "var(--theme-text)" }}
              className="w-full bg-transparent text-xs placeholder:text-[var(--theme-sidebar-muted)] focus:outline-none"
              aria-label="Find a page in navigation"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-0.5 text-[var(--theme-sidebar-muted)] hover:text-[var(--theme-text)] transition cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-2 pt-3 pb-2 shrink-0 flex justify-center">
          <button
            type="button"
            onClick={toggleCompact}
            style={{ 
              backgroundColor: "var(--theme-sidebar-card)", 
              borderColor: "var(--theme-sidebar-border)" 
            }}
            className="p-2 rounded-xl border text-[var(--theme-sidebar-muted)] hover:text-[var(--theme-primary)] transition cursor-pointer"
            title="Search pages (Expand sidebar)"
            aria-label="Expand sidebar to search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav groups and items */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto custom-scrollbar">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 px-2">
            <Search className="w-6 h-6 mx-auto mb-2 text-[var(--theme-sidebar-muted)] opacity-60" />
            <p className="text-xs font-semibold text-[var(--theme-sidebar-muted)]">No pages found</p>
            <p className="text-[11px] text-[var(--theme-sidebar-muted)] opacity-75 mt-0.5">
              No results for &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--theme-sidebar-border)] bg-[var(--theme-sidebar-card)] hover:bg-[var(--theme-sidebar-hover)] text-[var(--theme-primary)] transition cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.id} data-tour={group.dataTour} className="space-y-1">
              {/* Group Heading */}
              {!compactView ? (
                <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                  <span 
                    style={{ color: "var(--theme-sidebar-muted)" }}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider select-none flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] opacity-40" />
                    <span>{group.title}</span>
                  </span>
                </div>
              ) : (
                <div className="py-1 flex justify-center">
                  <span className="w-1 h-1 rounded-full bg-[var(--theme-sidebar-border)]" />
                </div>
              )}

              {/* Items in group */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isParentItemActive(item);
                  const hasChildren = Boolean(item.children && item.children.length > 0);
                  const isExpanded = Boolean(expandedSubmenus[item.id]);

                  if (compactView) {
                    // COMPACT ICON-ONLY ROW WITH TOOLTIP
                    return (
                      <div key={item.id} className="relative group/compact flex justify-center py-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasChildren) {
                              // If has children, go to first child
                              handleNavigate(item.children![0].path, item.children![0].id);
                            } else if (item.path) {
                              handleNavigate(item.path, item.id);
                            }
                          }}
                          data-tour={item.dataTour}
                          style={{
                            backgroundColor: isActive ? "var(--theme-primary-light)" : undefined,
                            color: "var(--theme-text)",
                            borderColor: isActive ? "var(--theme-primary)" : "transparent",
                          }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition duration-150 cursor-pointer relative ${
                            isActive ? "shadow-xs font-bold" : "hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-text)]"
                          }`}
                          aria-label={item.label}
                          title={item.label}
                        >
                          <Icon 
                            className="w-4 h-4 shrink-0" 
                            style={{ color: isActive ? "var(--theme-primary)" : "var(--theme-sidebar-muted)" }} 
                          />
                          {isActive && (
                            <span 
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                              style={{ backgroundColor: "var(--theme-primary)" }}
                            />
                          )}
                        </button>
                      </div>
                    );
                  }

                  // EXPANDED REGULAR ROW
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasChildren) {
                              toggleSubmenu(item.id);
                            } else if (item.path) {
                              handleNavigate(item.path, item.id);
                            }
                          }}
                          data-tour={item.dataTour}
                          style={{
                            backgroundColor: isActive && !hasChildren ? "var(--theme-primary-light)" : undefined,
                            color: "var(--theme-text)",
                            borderColor: isActive && !hasChildren ? "var(--theme-primary)" : "transparent",
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition duration-150 border cursor-pointer select-none ${
                            isActive && !hasChildren 
                              ? "shadow-2xs font-bold" 
                              : "hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-text)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon 
                              className="w-4 h-4 shrink-0"
                              style={{ color: isActive ? "var(--theme-primary)" : "var(--theme-sidebar-muted)" }}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {/* Submenu chevron or badge */}
                          {hasChildren ? (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubmenu(item.id);
                              }}
                              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--theme-sidebar-muted)] transition"
                              aria-label={isExpanded ? "Collapse submenu" : "Expand submenu"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                          ) : item.badge ? (
                            <span 
                              style={{ 
                                backgroundColor: "var(--theme-primary-light)", 
                                color: "var(--theme-primary)" 
                              }}
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </button>
                      </div>

                      {/* Submenu Child Items */}
                      {hasChildren && isExpanded && (
                        <div className="ml-4 pl-2.5 my-1 border-l-2 border-[var(--theme-sidebar-border)] space-y-1 animate-in fade-in duration-150">
                          {item.children!.map((child) => {
                            const isChildActive = isPathActive(child.path);
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => handleNavigate(child.path, child.id)}
                                data-tour={child.dataTour}
                                style={{
                                  backgroundColor: isChildActive ? "var(--theme-primary-light)" : undefined,
                                  color: "var(--theme-text)",
                                  fontWeight: isChildActive ? "700" : "500",
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition duration-150 text-left cursor-pointer ${
                                  isChildActive 
                                    ? "shadow-2xs" 
                                    : "hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-text)]"
                                }`}
                              >
                                <span 
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 transition ${
                                    isChildActive ? "bg-[var(--theme-primary)] scale-110" : "bg-[var(--theme-sidebar-muted)] opacity-40"
                                  }`} 
                                />
                                <span className="leading-snug break-words">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Theme & Display Quick Controls Tier (Student & Manager only) */}
      {!isAdmin && (
        <div 
          style={{ borderColor: "var(--theme-sidebar-border)" }}
          className={`px-3 py-2 border-t shrink-0 flex ${compactView ? "justify-center" : "items-center justify-between"}`}
        >
          <ThemeQuickControls 
            compact={compactView}
            onOpenPreferences={() => navigate(userRole === UserRole.MANAGER ? "/manager/profile" : "/student/profile")}
          />
        </div>
      )}

      {/* Compact Bottom Utility Tier (Tour & Sign Out) */}
      <div 
        style={{ borderColor: "var(--theme-sidebar-border)" }}
        className="p-3 border-t shrink-0 space-y-2 bg-[var(--theme-sidebar)]"
      >
        {/* Take a Tour */}
        <button
          type="button"
          data-tour="sidebar-tour-launcher"
          onClick={() => startTour(true)}
          style={{ 
            backgroundColor: "var(--theme-sidebar-card)", 
            borderColor: "var(--theme-sidebar-border)",
            color: "var(--theme-text)"
          }}
          className={`w-full flex items-center ${compactView ? "justify-center p-2.5" : "justify-between px-3 py-2"} border rounded-xl hover:border-[var(--theme-primary)] hover:bg-[var(--theme-sidebar-hover)] transition group cursor-pointer shadow-2xs`}
          title="Take an Interactive Product Tour"
          aria-label="Take an Interactive Product Tour"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-500 group-hover:scale-110 transition duration-150" />
            {!compactView && (
              <div className="text-left min-w-0">
                <p className="text-xs font-bold leading-tight truncate">Take a Tour</p>
                <p className="text-[10px] text-[var(--theme-sidebar-muted)] font-mono leading-tight">Interactive Guide</p>
              </div>
            )}
          </div>
          {!compactView && (
            <span 
              style={{ backgroundColor: "var(--theme-primary-light)", color: "var(--theme-primary)" }}
              className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md shrink-0"
            >
              Start
            </span>
          )}
        </button>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={onLogout}
          style={{ 
            backgroundColor: "var(--theme-sidebar-card)", 
            borderColor: "var(--theme-sidebar-border)",
            color: "var(--theme-sidebar-text)"
          }}
          className={`w-full flex items-center ${compactView ? "justify-center p-2.5" : "justify-center gap-2 px-3 py-2"} hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 border rounded-xl text-xs font-semibold transition duration-150 cursor-pointer shadow-2xs`}
          title="Sign Out of MRTECHLMS"
          aria-label="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!compactView && <span>Sign Out</span>}
        </button>

        {/* Compact Toggle on Desktop (ONLY for !isAdmin) */}
        {!isAdmin && (
          <button
            type="button"
            onClick={toggleCompact}
            style={{ color: "var(--theme-sidebar-muted)" }}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-medium hover:text-[var(--theme-text)] transition cursor-pointer"
            aria-label={compactView ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            title={compactView ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
          >
            {compactView ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Sliding Drawer (Screens < lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          
          {/* Sliding drawer */}
          <aside 
            style={{ 
              width: "280px", 
              maxWidth: "85vw", 
              backgroundColor: "var(--theme-sidebar)", 
              color: "var(--theme-sidebar-text)",
              borderColor: "var(--theme-sidebar-border)" 
            }}
            className="fixed inset-y-0 left-0 z-50 border-r flex flex-col h-full shadow-2xl select-none animate-in slide-in-from-left duration-200"
          >
            {/* Brand Header */}
            <div 
              style={{ borderColor: "var(--theme-sidebar-border)" }}
              className="p-4 border-b flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img 
                  src="/mr-logo-icon.png" 
                  alt="MR Technologies" 
                  className="w-8 h-8 object-contain shrink-0 drop-shadow-xs" 
                />
                <div className="min-w-0">
                  <h1 
                    style={{ color: "var(--theme-text)" }}
                    className="font-bold text-sm tracking-tight leading-none truncate"
                  >
                    MR TECHNOLOGIES
                  </h1>
                  <span 
                    style={{ color: "var(--theme-sidebar-muted)" }}
                    className="text-[9px] font-mono font-bold uppercase tracking-widest block mt-1 truncate capitalize"
                  >
                    {userRole} Portal • Medha
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onMobileClose}
                style={{ color: "var(--theme-sidebar-muted)" }}
                className="p-1.5 rounded-lg hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-text)] transition cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Info */}
            <div 
              style={{ backgroundColor: "var(--theme-sidebar-card)", borderColor: "var(--theme-sidebar-border)" }}
              className="p-3.5 border-b flex items-center gap-3 shrink-0"
            >
              <div 
                className="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden"
                style={{ backgroundColor: "var(--theme-sidebar)", borderColor: "var(--theme-sidebar-border)", color: "var(--theme-sidebar-text)" }}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p 
                  style={{ color: "var(--theme-text)" }}
                  className="text-xs font-bold truncate"
                >
                  {userName}
                </p>
                <p 
                  style={{ color: "var(--theme-text-muted)" }}
                  className="text-[10px] truncate font-mono mt-0.5"
                >
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Navigation Content */}
            {renderNavContent(false)}
          </aside>
        </div>
      )}

      {/* 2. Desktop In-Flow Sidebar (Fixed 280px for Admin, or 260px/72px for Student) */}
      <aside 
        style={{ 
          width: desktopWidth, 
          minWidth: desktopWidth, 
          maxWidth: desktopWidth, 
          backgroundColor: "var(--theme-sidebar)", 
          color: "var(--theme-sidebar-text)",
          borderColor: "var(--theme-sidebar-border)" 
        }}
        className="hidden lg:flex border-r flex-col h-screen sticky top-0 shrink-0 select-none z-30 transition-[width,min-width,max-width] duration-200 ease-in-out overflow-hidden"
      >
        {/* Brand Header */}
        <div 
          style={{ borderColor: "var(--theme-sidebar-border)" }}
          className={`p-4 border-b flex items-center shrink-0 ${effectiveCompact ? "justify-center" : "gap-3"}`}
        >
          <img 
            src="/mr-logo-icon.png" 
            alt="MR Technologies" 
            className="w-8 h-8 object-contain shrink-0 drop-shadow-xs" 
          />
          {!effectiveCompact && (
            <div className="min-w-0 flex-1">
              <h1 
                style={{ color: "var(--theme-text)" }}
                className="font-bold text-sm tracking-tight leading-none truncate"
              >
                MR TECHNOLOGIES
              </h1>
              <span 
                style={{ color: "var(--theme-sidebar-muted)" }}
                className="text-[9px] font-mono font-bold uppercase tracking-widest block mt-1 truncate capitalize"
              >
                {userRole} Portal • Medha
              </span>
            </div>
          )}
        </div>

        {/* User Status Profile */}
        <div 
          style={{ backgroundColor: "var(--theme-sidebar-card)", borderColor: "var(--theme-sidebar-border)" }}
          className={`p-3 border-b flex items-center shrink-0 ${effectiveCompact ? "justify-center" : "gap-3"}`}
        >
          <div 
            className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shadow-xs shrink-0 overflow-hidden"
            style={{ backgroundColor: "var(--theme-sidebar)", borderColor: "var(--theme-sidebar-border)", color: "var(--theme-sidebar-text)" }}
            title={`${userName} (${userEmail})`}
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              userName.charAt(0)
            )}
          </div>
          {!effectiveCompact && (
            <div className="min-w-0 flex-1">
              <p 
                style={{ color: "var(--theme-text)" }}
                className="text-xs font-bold truncate leading-tight"
              >
                {userName}
              </p>
              <p 
                style={{ color: "var(--theme-text-muted)" }}
                className="text-[10px] truncate font-mono mt-0.5 leading-tight"
              >
                {userEmail}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Content */}
        {renderNavContent(effectiveCompact)}
      </aside>
    </>
  );
}
