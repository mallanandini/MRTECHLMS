/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  MapPin, Phone, Mail, Clock, Send, 
  CheckCircle2, AlertCircle, Building2, ExternalLink 
} from "lucide-react";

interface HomeContactProps {
  initialProgram?: string;
}

export function HomeContact({ initialProgram }: HomeContactProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    program: initialProgram || "Java Full Stack Development",
    mode: "Classroom (Dabagardens Campus)",
    batchTiming: "Morning (9:00 AM – 12:00 PM)",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial program prop changes if passed from programs card
  React.useEffect(() => {
    if (initialProgram) {
      setFormData(prev => ({ ...prev, program: initialProgram }));
    }
  }, [initialProgram]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    const phoneDigits = formData.phone.replace(/[^0-9]/g, "");
    if (phoneDigits.length < 10) {
      setError("Please enter a valid phone number with at least 10 digits.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <section id="contact" className="py-16 sm:py-24 bg-slate-50 dark:bg-[#0F172A] border-t border-slate-200/80 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Admissions & Enterprise Enquiries</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-[#F1F5F9] tracking-tight">
            Connect with MR Technologies
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-[#A8B5C7] leading-relaxed">
            Have questions about upcoming batches, curriculum tracks, college workshops, or corporate recruitment? Visit our campus or reach out directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12">
          {/* Left Column: Verified Location & Contact Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-8 space-y-6 shadow-xs">
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Campus Headquarters</span>
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Address */}
                <div className="flex items-start gap-3.5 text-slate-700 dark:text-[#A8B5C7]">
                  <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-[#F1F5F9] font-semibold">Address</strong>
                    <span>30-5-8, 2nd Floor, BSNL Building, Bhanu Street, Dabagardens, Visakhapatnam - 530020, Andhra Pradesh, India</span>
                  </div>
                </div>

                {/* Telephone */}
                <div className="flex items-start gap-3.5 text-slate-700 dark:text-[#A8B5C7]">
                  <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-[#F1F5F9] font-semibold">Phone & WhatsApp</strong>
                    <div className="space-y-0.5 mt-0.5">
                      <a href="tel:+919963929944" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition block">
                        +91 99639 29944
                      </a>
                      <a href="tel:+919989443915" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition block">
                        +91 99894 43915
                      </a>
                      <a href="tel:+919989196018" className="hover:text-amber-600 dark:hover:text-amber-400 transition block">
                        +91 99891 96018 (RUBIKS)
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3.5 text-slate-700 dark:text-[#A8B5C7]">
                  <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-[#F1F5F9] font-semibold">Official Emails</strong>
                    <div className="space-y-0.5 mt-0.5">
                      <a href="mailto:info@mrtechinfo.com" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition block">
                        info@mrtechinfo.com
                      </a>
                      <a href="mailto:sales@rubiksbs.com" className="hover:text-amber-600 dark:hover:text-amber-400 transition block">
                        sales@rubiksbs.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-3.5 text-slate-700 dark:text-[#A8B5C7]">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-[#F1F5F9] font-semibold">Center Hours</strong>
                    <span>Monday – Saturday: 9:00 AM – 7:30 PM IST</span>
                  </div>
                </div>
              </div>

              {/* External Links */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-[#263449] flex flex-wrap gap-3">
                <a
                  href="https://mrtechinfo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <span>mrtechinfo.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="text-slate-300 dark:text-[#263449]">•</span>
                <a
                  href="https://rubiksbs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>rubiksbs.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Enquiry Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111C30] p-6 sm:p-8 shadow-xs">
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] mb-2">
                Send an Admissions Enquiry
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A8B5C7] mb-6">
                Fill out the form below and our career counseling team at Dabagardens will guide you through upcoming batches and curriculum details.
              </p>

              {submitted ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                    Thank You, {formData.name}!
                  </h4>
                  <div className="text-xs text-slate-600 dark:text-[#A8B5C7] max-w-lg mx-auto space-y-1.5 py-1">
                    <p>
                      Your admissions enquiry for <strong>{formData.program}</strong> ({formData.mode}) has been recorded.
                    </p>
                    <p className="text-slate-500 dark:text-[#A8B5C7]">
                      Preferred Batch: <strong>{formData.batchTiming}</strong>
                    </p>
                    <p>
                      An academic counselor will contact you via phone at <strong>{formData.phone}</strong> or email at <strong>{formData.email}</strong> within 24 business hours.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ 
                        name: "", 
                        email: "", 
                        phone: "", 
                        program: "Java Full Stack Development", 
                        mode: "Classroom (Dabagardens Campus)",
                        batchTiming: "Morning (9:00 AM – 12:00 PM)",
                        message: "" 
                      });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline cursor-pointer mt-2"
                  >
                    Submit another enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. ramesh@example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                        Program of Interest
                      </label>
                      <select
                        value={formData.program}
                        onChange={e => setFormData({ ...formData, program: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Java Full Stack Development">Java Full Stack Development</option>
                        <option value="Python with AI">Python with AI</option>
                        <option value="Python with Data Science">Python with Data Science</option>
                        <option value="Python with Data Analytics">Python with Data Analytics</option>
                        <option value="Full Stack Web Development">Full Stack Web Development</option>
                        <option value="Software Testing & SDET">Software Testing & SDET</option>
                        <option value="Business Analytics & Power BI">Business Analytics & Power BI</option>
                        <option value="Industry Internship Projects">Industry Internship Projects</option>
                        <option value="College Workshops & Campus Recruitment Training">College Workshops & Campus Recruitment Training</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                        Preferred Learning Mode
                      </label>
                      <select
                        value={formData.mode}
                        onChange={e => setFormData({ ...formData, mode: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Classroom (Dabagardens Campus)">Classroom (Dabagardens Campus)</option>
                        <option value="Online Live Interactive">Online Live Interactive</option>
                        <option value="Hybrid (Classroom + Online)">Hybrid (Classroom + Online)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                        Preferred Batch Timing
                      </label>
                      <select
                        value={formData.batchTiming}
                        onChange={e => setFormData({ ...formData, batchTiming: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Morning (9:00 AM – 12:00 PM)">Morning (9:00 AM – 12:00 PM)</option>
                        <option value="Afternoon (2:00 PM – 5:00 PM)">Afternoon (2:00 PM – 5:00 PM)</option>
                        <option value="Evening (5:30 PM – 7:30 PM)">Evening (5:30 PM – 7:30 PM)</option>
                        <option value="Weekend Special Batch">Weekend Special Batch</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#A8B5C7] mb-1.5">
                      Message / Special Queries (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your educational background or preferred start dates..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Enquiry</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
