/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link } from "react-router-dom";
import { 
  Building2, GraduationCap, ShieldCheck, Lock, 
  ExternalLink, Mail, Phone, MapPin 
} from "lucide-react";

interface HomeFooterProps {
  onScrollTo: (sectionId: string) => void;
}

export function HomeFooter({ onScrollTo }: HomeFooterProps) {
  return (
    <footer className="bg-[#070B14] text-[#A8B5C7] border-t border-[#263449] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: Brand & Overview (Spans 2 on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/mr-logo-icon.png" 
                alt="MR Technologies" 
                className="w-10 h-10 object-contain drop-shadow-xs" 
              />
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#F1F5F9] block">
                  MR TECHNOLOGIES
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                  Medha XL • RUBIKS Ecosystem
                </span>
              </div>
            </Link>

            <p className="text-[#A8B5C7] leading-relaxed max-w-sm">
              Unified IT training, professional internship projects, and recruitment services in Visakhapatnam. Empowering learners to master modern technology stacks and connect with real hiring partners.
            </p>

            <div className="space-y-1.5 text-[11px] text-[#A8B5C7] pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dabagardens, Visakhapatnam - 530020</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href="tel:+919963929944" className="hover:text-[#F1F5F9] transition">+91 99639 29944</a>
                <span>•</span>
                <a href="tel:+919989443915" className="hover:text-[#F1F5F9] transition">+91 99894 43915</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href="mailto:info@mrtechinfo.com" className="hover:text-[#F1F5F9] transition">info@mrtechinfo.com</a>
              </div>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#F1F5F9] uppercase tracking-wider text-[11px]">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onScrollTo("hero")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("about")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Training Programs
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("services")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Our Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("journey")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Learning Journey
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("careers")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Career Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("contact")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Featured Tracks */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#F1F5F9] uppercase tracking-wider text-[11px]">
              Training Tracks
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Java Full Stack
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Python with AI
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Data Science & Analytics
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  MERN Web Development
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Software Testing / SDET
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollTo("programs")}
                  className="hover:text-[#F1F5F9] transition cursor-pointer text-left"
                >
                  Campus Recruitment (CRT)
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Portals & External Ecosystem */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#F1F5F9] uppercase tracking-wider text-[11px]">
              Portals & Ecosystem
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/student/login"
                  id="footer-student-login-link"
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student Learning Portal</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/verify-certificate"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify Credential</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://mrtechinfo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F1F5F9] transition flex items-center gap-1.5"
                >
                  <span>MR Technologies Official</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://rubiksbs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F1F5F9] transition flex items-center gap-1.5"
                >
                  <span>RUBIKS Recruitment</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="mt-12 pt-6 border-t border-[#263449] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#A8B5C7] text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} MR Technologies. All rights reserved. Dabagardens, Visakhapatnam, AP, India.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-mono text-[10px]">
              Unified Enterprise LMS Platform
            </span>
            <span>•</span>
            <Link to="/verify-certificate" className="hover:text-[#F1F5F9]">
              Credential Verification
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
