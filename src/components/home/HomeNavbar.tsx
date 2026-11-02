/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GraduationCap, Menu, X, ArrowRight, ShieldCheck, 
  UserCheck 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { UserRole } from "../../types.js";
import { ThemeQuickControls } from "../ThemeQuickControls.js";

interface HomeNavbarProps {
  onScrollTo: (sectionId: string) => void;
}

export function HomeNavbar({ onScrollTo }: HomeNavbarProps) {
  const { currentUser, authToken } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);

      const sectionIds = ["hero", "about", "programs", "services", "why-us", "journey", "careers", "contact"];
      const scrollPos = window.scrollY + 200;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && scrollPos >= el.offsetTop) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Home", shortLabel: "Home", sectionId: "hero" },
    { label: "About Us", shortLabel: "About", sectionId: "about" },
    { label: "Training Programs", shortLabel: "Programs", sectionId: "programs" },
    { label: "Our Services", shortLabel: "Services", sectionId: "services" },
    { label: "Learning Journey", shortLabel: "Journey", sectionId: "journey" },
    { label: "Career Support", shortLabel: "Careers", sectionId: "careers" },
    { label: "Contact Us", shortLabel: "Contact", sectionId: "contact" }
  ];

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
    onScrollTo(sectionId);
  };

  // Determine user-appropriate dashboard target if already logged in as a student
  const getDashboardTarget = () => {
    if (!currentUser || !authToken) return null;
    if (currentUser.role === UserRole.STUDENT) {
      return { path: "/student/dashboard", label: "Student Dashboard", shortLabel: "Dashboard" };
    }
    return null;
  };

  const dashboardTarget = getDashboardTarget();

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-200 border-b ${
        scrolled 
          ? "bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md shadow-xs border-slate-200/80 dark:border-[#263449]/80 py-2" 
          : "bg-white dark:bg-[#0B1120] border-slate-200/60 dark:border-[#263449] py-2.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 2xl:gap-4 h-11 sm:h-12 min-w-0">
          {/* Brand Logo & Identification */}
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-2.5 2xl:gap-3 shrink-0 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-1"
            aria-label="MR Technologies Home"
          >
            <div className="relative">
              <img 
                src="/mr-logo-icon.png" 
                alt="MR Technologies Logo" 
                className="w-8 h-8 sm:w-8.5 sm:h-8.5 2xl:w-9 2xl:h-9 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[14px] 2xl:text-[15.5px] tracking-tight text-slate-900 dark:text-[#F1F5F9] leading-tight">
                MR TECHNOLOGIES
              </span>
              <span className="text-[8.5px] 2xl:text-[9.5px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mt-0.5">
                <span className="hidden 2xl:inline">Medha XL • RUBIKS Ecosystem</span>
                <span className="2xl:hidden">Medha XL • RUBIKS</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Centered, Evenly Spaced & Clean Baseline Styling */}
          <nav 
            aria-label="Main Navigation"
            className="hidden xl:flex items-center gap-0.5 2xl:gap-1.5 text-[12.5px] 2xl:text-[13.5px] font-medium"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.sectionId;
              return (
                <button
                  key={item.sectionId}
                  onClick={() => handleNavClick(item.sectionId)}
                  className={`relative px-2 2xl:px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap leading-none ${
                    isActive 
                      ? "text-emerald-700 dark:text-emerald-400 font-semibold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-emerald-600 dark:after:bg-emerald-400 after:rounded-full" 
                      : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  <span className="hidden 2xl:inline">{item.label}</span>
                  <span className="2xl:hidden">{item.shortLabel}</span>
                </button>
              );
            })}

            <Link
              to="/verify-certificate"
              className="inline-flex items-center gap-1.5 px-2 2xl:px-2.5 py-1.5 rounded-md text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors whitespace-nowrap leading-none font-medium"
              title="Official Public Credential Verification"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden 2xl:inline">Verify Credential</span>
              <span className="2xl:hidden">Verify</span>
            </Link>
          </nav>

          {/* Desktop Actions: Compact Theme Toggle + Fully Visible Student Login / Dashboard */}
          <div className="hidden xl:flex items-center gap-2 2xl:gap-2.5 shrink-0">
            <ThemeQuickControls compact={true} />

            {dashboardTarget ? (
              <Link
                to={dashboardTarget.path}
                id="header-student-dashboard-btn"
                className="inline-flex items-center justify-center gap-1.5 px-3 2xl:px-3.5 h-8.5 2xl:h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs 2xl:text-sm font-semibold shadow-xs hover:shadow transition duration-150 cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <UserCheck className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                <span className="hidden 2xl:inline">{dashboardTarget.label}</span>
                <span className="2xl:hidden">{dashboardTarget.shortLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            ) : (
              <Link
                to="/student/login"
                id="header-student-login-btn"
                className="inline-flex items-center justify-center gap-1.5 px-3 2xl:px-3.5 h-8.5 2xl:h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs 2xl:text-sm font-semibold shadow-xs hover:shadow transition duration-150 cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <GraduationCap className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-emerald-100 shrink-0" />
                <span className="hidden 2xl:inline">Student Login</span>
                <span className="2xl:hidden">Login</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            )}
          </div>

          {/* Mobile/Tablet Controls (Theme Toggle + Hamburger Menu Button) */}
          <div className="flex xl:hidden items-center gap-2 shrink-0">
            <ThemeQuickControls compact={true} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#16243D] transition focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          aria-label="Mobile navigation"
          className="xl:hidden border-t border-slate-200 dark:border-[#263449] bg-white dark:bg-[#0B1120] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#263449]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A8B5C7]">
              Navigation Menu
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#A8B5C7] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#16243D] transition"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.sectionId}
                onClick={() => handleNavClick(item.sectionId)}
                className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeSection === item.sectionId
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 font-bold border border-emerald-200 dark:border-emerald-500/30"
                    : "text-slate-700 dark:text-[#F1F5F9] hover:bg-emerald-50/60 dark:hover:bg-[#16243D] hover:text-emerald-700 dark:hover:text-emerald-300"
                }`}
              >
                {item.label}
              </button>
            ))}

            <Link
              to="/verify-certificate"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/15 transition-all duration-150"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verify Official Credential</span>
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 dark:border-[#263449] flex flex-col gap-3">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-medium text-slate-600 dark:text-[#A8B5C7]">Theme Appearance</span>
              <ThemeQuickControls />
            </div>

            {dashboardTarget ? (
              <Link
                to={dashboardTarget.path}
                id="drawer-student-dashboard-btn"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
              >
                <UserCheck className="w-4 h-4" />
                <span>Go to {dashboardTarget.label}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/student/login"
                id="drawer-student-login-btn"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
              >
                <GraduationCap className="w-4 h-4 text-emerald-100" />
                <span>Student Login — Access Portal</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
