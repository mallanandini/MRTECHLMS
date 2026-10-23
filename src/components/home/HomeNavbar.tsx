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
    { label: "Home", sectionId: "hero" },
    { label: "About Us", sectionId: "about" },
    { label: "Training Programs", sectionId: "programs" },
    { label: "Our Services", sectionId: "services" },
    { label: "Learning Journey", sectionId: "journey" },
    { label: "Career Support", sectionId: "careers" },
    { label: "Contact Us", sectionId: "contact" }
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
      return { path: "/student/dashboard", label: "Student Dashboard" };
    }
    return null;
  };

  const dashboardTarget = getDashboardTarget();

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-200 border-b ${
        scrolled 
          ? "bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md shadow-xs border-slate-200/80 dark:border-[#263449]/80 py-2 sm:py-2.5" 
          : "bg-white dark:bg-[#0B1120] border-slate-100 dark:border-[#263449] py-2.5 sm:py-3"
      }`}
    >
      <div className="w-full max-w-[1440px] mx-auto px-3.5 sm:px-5 lg:px-6 2xl:px-8">
        <div className="flex items-center justify-between gap-2 xl:gap-3 2xl:gap-4 h-12 sm:h-13 min-w-0">
          {/* Brand Logo & Identification */}
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 shrink-0 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl p-1"
            aria-label="MR Technologies Home"
          >
            <div className="relative">
              <img 
                src="/mr-logo-icon.png" 
                alt="MR Technologies Logo" 
                className="w-8.5 h-8.5 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[14.5px] sm:text-[15.5px] 2xl:text-lg tracking-tight text-slate-900 dark:text-[#F1F5F9] leading-tight">
                MR TECHNOLOGIES
              </span>
              <span className="text-[8.5px] sm:text-[9.5px] 2xl:text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mt-0.5">
                Medha XL • RUBIKS Ecosystem
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Centered, Evenly Spaced & Subtle Emerald Styling */}
          <nav 
            aria-label="Main Navigation"
            className="hidden xl:flex items-center gap-0.5 2xl:gap-1 text-[12px] 2xl:text-[12.5px] font-medium"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.sectionId;
              return (
                <button
                  key={item.sectionId}
                  onClick={() => handleNavClick(item.sectionId)}
                  className={`nav-link-btn px-2 2xl:px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer flex items-center justify-center leading-none ${
                    isActive ? "nav-link-active font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <Link
              to="/verify-certificate"
              className="nav-verify-btn px-2 2xl:px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap font-medium leading-none"
              title="Official Public Credential Verification"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Verify Credential</span>
            </Link>
          </nav>

          {/* Desktop Actions: Compact Theme Toggle + Fully Visible Student Login / Dashboard */}
          <div className="hidden xl:flex items-center gap-2 2xl:gap-2.5 shrink-0">
            <ThemeQuickControls compact={true} />

            {dashboardTarget ? (
              <Link
                to={dashboardTarget.path}
                id="header-student-dashboard-btn"
                className="group inline-flex items-center justify-center gap-1.5 2xl:gap-2 px-3.5 2xl:px-4 h-8.5 2xl:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs 2xl:text-sm font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <UserCheck className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                <span>{dashboardTarget.label}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            ) : (
              <Link
                to="/student/login"
                id="header-student-login-btn"
                className="group inline-flex items-center justify-center gap-1.5 2xl:gap-2 px-3.5 2xl:px-4 h-8.5 2xl:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs 2xl:text-sm font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <GraduationCap className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-emerald-100 shrink-0" />
                <span>Student Login</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
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
