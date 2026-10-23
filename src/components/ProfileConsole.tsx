/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  User as UserIcon, Lock, Sparkles, BookOpen, AlertCircle, 
  CheckCircle, CheckCircle2, Bookmark, BookmarkMinus, Settings, RefreshCw, Key,
  Palette, Sun, Moon, Building2, Layers, Users as UsersIcon,
  Award, Trophy, Crown, Medal, Flame, Footprints, Code, ExternalLink,
  Clock, Target, Zap, GraduationCap, ShieldCheck, Upload
} from "lucide-react";
import { User, Blog } from "../types.js";
import { useTheme } from "../context/ThemeContext.js";

interface ProfileConsoleProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  authToken: string;
  onReadBlog: (blogId: string) => void;
  onNavigate?: (tab: string) => void;
}

interface LearningProfileData {
  personalInfo: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    departmentName?: string;
    profilePhoto?: string | null;
    bio?: string;
    joinedDate: string;
  };
  statistics: {
    totalAssignedCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    overallCompletionRate: number;
    passedAssessments: number;
    totalAssessmentsAttempted: number;
    averageAssessmentScore: number;
    totalCertificates: number;
    codingChallengesSolved: number;
    totalLessonsCompleted: number;
    learningStreakDays: number;
    estimatedLearningHours: number;
  };
  certificates: Array<{
    id: string;
    certificateNumber: string;
    verificationCode: string;
    title: string;
    type: string;
    scorePercentage: number;
    issuedAt: string;
    expiresAt?: string | null;
    status: string;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedAt?: string;
  }>;
  skills: string[];
  recentActivity: Array<{
    type: string;
    title: string;
    detail: string;
    date: string;
    status: string;
  }>;
}

const AVATAR_PRESETS = [
  { name: "Neon Dev", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" },
  { name: "Professional Woman", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { name: "Creative Designer", url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80" },
  { name: "Systems Engineer", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { name: "Backend Specialist", url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80" },
  { name: "Full Stack Lead", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
];

export function ProfileConsole({
  currentUser,
  setCurrentUser,
  authToken,
  onReadBlog,
  onNavigate
}: ProfileConsoleProps) {
  // Active Tab: Learning profile by default for students, personal info for others
  const isStudent = currentUser.role === "student";
  const [activeTab, setActiveTab] = useState<"learning" | "personal" | "settings" | "bookmarks">(
    isStudent ? "learning" : "personal"
  );

  // Student Learning Profile data
  const [learningData, setLearningData] = useState<LearningProfileData | null>(null);
  const [loadingLearning, setLoadingLearning] = useState(isStudent);

  // Profile update form state
  const [name, setName] = useState(currentUser.name);
  const [profilePhoto, setProfilePhoto] = useState(currentUser.profilePhoto || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Profile avatar upload from device state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password reset form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Theme Context hook
  const { 
    theme, mode, availableThemes, setTheme, setMode, 
    isSaving: isSavingTheme, error: themeError 
  } = useTheme();

  // Bookmarked blogs state
  const [bookmarks, setBookmarks] = useState<Blog[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);

  // Student Organization affiliations state
  const [studentOrg, setStudentOrg] = useState<{
    department?: { id: string; name: string; code: string; managerName?: string | null } | null;
    manager?: { id: string; name: string; email: string } | null;
    cohorts: Array<{ id: string; name: string; code: string; status: string }>;
    groups: Array<{ id: string; name: string; type: string }>;
  } | null>(null);

  const fetchLearningProfile = async () => {
    if (!isStudent) return;
    setLoadingLearning(true);
    try {
      const res = await fetch("/api/student/profile/learning-profile", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLearningData(data);
      }
    } catch (err) {
      console.error("Failed to load learning profile data", err);
    } finally {
      setLoadingLearning(false);
    }
  };

  const fetchBookmarks = async () => {
    setLoadingBookmarks(true);
    try {
      const res = await fetch("/api/student/bookmarks", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch bookmarks list", e);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  const fetchStudentOrg = async () => {
    try {
      const res = await fetch("/api/student/organization", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentOrg(data);
      }
    } catch (e) {
      console.error("Failed to fetch student organization details", e);
    }
  };

  useEffect(() => {
    fetchLearningProfile();
    fetchBookmarks();
    fetchStudentOrg();
  }, [authToken]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage("");
    setProfileError("");
    setFileError("");
    
    if (!name.trim()) {
      setProfileError("Full Name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    try {
      let finalProfilePhoto = profilePhoto;

      // If a local image file was selected from device, upload it first
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/user/avatar", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          },
          body: formData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({ error: "Avatar upload failed" }));
          setProfileError(errData.error || "Failed to upload photo from device.");
          setIsSavingProfile(false);
          return;
        }

        const uploadData = await uploadRes.json();
        finalProfilePhoto = uploadData.url;
      }

      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, profilePhoto: finalProfilePhoto })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(filePreviewUrl);
        }
        setSelectedFile(null);
        setFilePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        setProfilePhoto(updatedUser.profilePhoto || finalProfilePhoto);
        setCurrentUser(updatedUser);
        setProfileMessage("Your profile information has been saved successfully!");
      } else {
        const err = await res.json();
        setProfileError(err.error || "Failed to update profile.");
      }
    } catch (err) {
      setProfileError("A network error occurred. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setPassword("");
        setConfirmPassword("");
        setPasswordMessage("Your login password has been changed successfully!");
      } else {
        const err = await res.json();
        setPasswordError(err.error || "Failed to change password.");
      }
    } catch (err) {
      setPasswordError("A network error occurred. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRemoveBookmark = async (blogId: string) => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/bookmark`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarks(prev => prev.filter(b => b.id !== blogId));
        setCurrentUser({
          ...currentUser,
          bookmarkedBlogIds: data.bookmarkedBlogIds
        });
      }
    } catch (e) {
      console.error("Failed to unbookmark blog", e);
    }
  };

  const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // User cancelled native file dialog: keep existing selection, don't crash
      return;
    }

    setFileError("");

    // Validate MIME type
    if (!ALLOWED_AVATAR_TYPES.includes(file.type.toLowerCase())) {
      setFileError("Invalid file type. Only JPG, JPEG, PNG, and WEBP image files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file size (5 MB limit)
    if (file.size > MAX_AVATAR_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileError(`File size (${sizeMB} MB) exceeds the maximum allowed limit of 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreviewUrl(preview);
    setProfilePhoto(preview);
  };

  const handleCustomUrlChange = (url: string) => {
    if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setProfilePhoto(url);
  };

  const selectAvatarPreset = (url: string) => {
    if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setProfilePhoto(url);
  };

  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      if (!selectedFile) {
        setProfilePhoto(currentUser.profilePhoto || "");
      }
    }
  }, [currentUser]);

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "Footprints": return <Footprints className="w-5 h-5" />;
      case "Trophy": return <Trophy className="w-5 h-5" />;
      case "Crown": return <Crown className="w-5 h-5" />;
      case "Award": return <Award className="w-5 h-5" />;
      case "Code": return <Code className="w-5 h-5" />;
      case "Medal": return <Medal className="w-5 h-5" />;
      case "Flame": return <Flame className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-indigo-100 text-black border border-indigo-200 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
          <GraduationCap className="w-64 h-64 transform translate-x-12 translate-y-12 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative group">
              {profilePhoto ? (
                <img src={profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-300">{currentUser.name.charAt(0)}</span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{currentUser.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/15 text-white border border-white/20">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-blue-100/90 text-xs sm:text-sm font-medium">{currentUser.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-blue-200/80 font-mono mt-1">
                {studentOrg?.department && (
                  <span>Dept: {studentOrg.department.name}</span>
                )}
                <span>Joined: {new Date(currentUser.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge for Header */}
          {learningData && (
            <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 sm:p-4 text-center shrink-0">
              <div className="px-2">
                <p className="text-lg sm:text-xl font-black text-white">{learningData.statistics.completedCourses}</p>
                <p className="text-[10px] uppercase font-mono tracking-wider text-blue-200">Completed</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="px-2">
                <p className="text-lg sm:text-xl font-black text-amber-300 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 fill-amber-300" />
                  {learningData.statistics.learningStreakDays}d
                </p>
                <p className="text-[10px] uppercase font-mono tracking-wider text-blue-200">Streak</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="px-2">
                <p className="text-lg sm:text-xl font-black text-emerald-300">{learningData.certificates.length}</p>
                <p className="text-[10px] uppercase font-mono tracking-wider text-blue-200">Certs</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-4 overflow-x-auto pb-px">
        {isStudent && (
          <button
            onClick={() => setActiveTab("learning")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "learning"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Learning & Achievements</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("personal")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "personal"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Personal Info & Team</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Preferences & Security</span>
        </button>

        <button
          onClick={() => setActiveTab("bookmarks")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "bookmarks"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Articles ({bookmarks.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LEARNING & ACHIEVEMENTS                                            */}
      {/* ========================================================================= */}
      {activeTab === "learning" && (
        <div className="space-y-8 animate-in fade-in duration-150">
          
          {loadingLearning ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-xs text-slate-400 font-mono">Loading your learning credentials & progress...</p>
            </div>
          ) : learningData ? (
            <>
              {/* Learning Statistics Scorecard */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Learning Performance Scorecard</span>
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Card 1: Completed Courses */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Courses</span>
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {learningData.statistics.completedCourses}
                      </p>
                      <span className="text-xs text-slate-400 font-mono">/ {learningData.statistics.totalAssignedCourses}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {learningData.statistics.inProgressCourses} currently active
                    </p>
                  </div>

                  {/* Card 2: Overall Progress */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Progress</span>
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {learningData.statistics.overallCompletionRate}%
                    </p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, learningData.statistics.overallCompletionRate)}%` }} 
                      />
                    </div>
                  </div>

                  {/* Card 3: Learning Hours */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Study Hours</span>
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {learningData.statistics.estimatedLearningHours}h
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {learningData.statistics.totalLessonsCompleted} topics studied
                    </p>
                  </div>

                  {/* Card 4: Daily Streak */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Streak</span>
                      <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {learningData.statistics.learningStreakDays}
                      </p>
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-bold">Days</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Consistent daily habit
                    </p>
                  </div>

                  {/* Card 5: Assessments Passed */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Assessments</span>
                      <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {learningData.statistics.passedAssessments}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Avg Score: <strong>{learningData.statistics.averageAssessmentScore}%</strong>
                    </p>
                  </div>

                  {/* Card 6: Coding Solved */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Coding Solved</span>
                      <Code className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {learningData.statistics.codingChallengesSolved}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Hands-on exercises
                    </p>
                  </div>

                  {/* Card 7: Verified Certificates */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase">Certificates</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {learningData.certificates.length}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Tamper-evident credentials
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Mastered & Competencies */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>Skills & Competencies Acquired</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Technical proficiencies verified through completed course curricula and hands-on modules
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full shrink-0">
                    {learningData.skills.length} Mastered
                  </span>
                </div>

                {learningData.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {learningData.skills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{skill}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <p className="text-xs">No course skills indexed yet.</p>
                    <p className="text-[11px] text-slate-500">Complete curriculum lessons and exercises to build your technical competencies badge showcase.</p>
                  </div>
                )}
              </div>

              {/* Dynamic Achievements & Badges Showcase */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span>Achievements & Learning Milestones</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Dynamic honors unlocked as you complete topics, pass assessments, and maintain study momentum
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-3 py-1 rounded-full shrink-0">
                    {learningData.achievements.filter(a => a.earned).length} / {learningData.achievements.length} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {learningData.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        ach.earned
                          ? "bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border-amber-200 dark:border-amber-800/60 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-850/40 border-slate-200/60 dark:border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              ach.earned
                                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {getAchievementIcon(ach.icon)}
                          </div>
                          {ach.earned ? (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                              ✓ Unlocked
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                            {ach.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {ach.description}
                          </p>
                        </div>
                      </div>

                      {ach.earned && (
                        <div className="mt-4 pt-2 border-t border-amber-100/80 dark:border-amber-900/30 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Honors Earned</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Certificates Showcase */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Medal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified Credentials & Certificates</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Official certificates of curriculum completion and demonstrated subject competency
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate && onNavigate("certificates")}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>View Certificate Registry</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {learningData.certificates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {learningData.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                              Verified Certificate
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {cert.title}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            Credential Code: <strong className="text-slate-700 dark:text-slate-200">{cert.verificationCode || cert.certificateNumber}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <a
                            href={`/verify-certificate/${cert.verificationCode || cert.certificateNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Verify Online</span>
                          </a>
                          <button
                            onClick={() => onNavigate && onNavigate("certificates")}
                            className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>Open Certificate</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <Medal className="w-10 h-10 stroke-[1.2] mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No certificates earned yet</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Complete all modules and pass the final course evaluation in accredited courses to receive verifiable certificates.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERSONAL INFORMATION & TEAM                                        */}
      {/* ========================================================================= */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          
          {/* Edit Profile Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <UserIcon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              <span>Personal Details</span>
            </h3>

            {profileMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Email Address (Read Only)</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-850 mt-1.5 text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Custom Avatar Image URL</label>
                <input
                  type="text"
                  value={profilePhoto}
                  onChange={(e) => handleCustomUrlChange(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mt-1.5 font-mono"
                />
              </div>

              {/* Avatar Preset Grid */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Or Choose from Curated Avatar Presets
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {AVATAR_PRESETS.map((avatar, idx) => {
                    const isSelected = profilePhoto === avatar.url && !selectedFile;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectAvatarPreset(avatar.url)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 relative hover:scale-105 transition duration-150 cursor-pointer ${
                          isSelected ? "border-blue-600 ring-2 ring-blue-500/10" : "border-slate-100 dark:border-slate-800 hover:border-slate-300"
                        }`}
                        title={avatar.name}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Profile Photo */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Upload Profile Photo
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-full border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shrink-0 flex items-center justify-center shadow-xs">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile Preview" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          aria-label="Upload profile photo"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-750 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Upload from Device</span>
                        </button>
                        {selectedFile && (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{selectedFile.name} (Ready to save)</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Supported formats: JPG, JPEG, PNG, WEBP • Max 5 MB
                      </p>
                    </div>
                  </div>
                  {fileError && (
                    <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-medium pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingProfile ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Organization Affiliations */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  <span>My Organization</span>
                </h3>
                <p className="text-[11px] text-slate-400">Department, Batch, and Assigned Learning Groups</p>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Department */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Department</span>
                    {studentOrg?.department && (
                      <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase">
                        {studentOrg.department.code}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {studentOrg?.department?.name || "General Academy"}
                  </div>
                  {studentOrg?.department?.managerName && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lead: {studentOrg.department.managerName}
                    </div>
                  )}
                </div>

                {/* Direct Reporting Manager */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">Reporting Manager</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {studentOrg?.manager?.name || "Academy Academic Director"}
                  </div>
                  {studentOrg?.manager?.email && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {studentOrg.manager.email}
                    </div>
                  )}
                </div>

                {/* Batches / Cohorts */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Enrolled Cohorts</span>
                  </div>
                  {studentOrg?.cohorts && studentOrg.cohorts.length > 0 ? (
                    <div className="space-y-1">
                      {studentOrg.cohorts.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase font-bold">
                            {c.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">Global Standard Track</div>
                  )}
                </div>

                {/* Groups */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Assigned Groups</span>
                  </div>
                  {studentOrg?.groups && studentOrg.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {studentOrg.groups.map(g => (
                        <span key={g.id} className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 font-semibold text-[10px]">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">Full-Access Learner Pool</div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SETTINGS & APPEARANCE                                              */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Theme & Visual Display Preferences */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <span>Theme & Display Preferences</span>
              </h3>
              <div className="flex items-center gap-2">
                {isSavingTheme && (
                  <span className="text-[10px] text-blue-600 font-mono font-bold animate-pulse">
                    Saving to MySQL...
                  </span>
                )}
                {themeError && (
                  <span className="text-[10px] text-rose-500 font-mono font-bold">
                    {themeError}
                  </span>
                )}
              </div>
            </div>

            {/* Light / Dark Mode Toggle */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                Interface Mode
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setMode("light")}
                  style={{
                    backgroundColor: mode === "light" ? "var(--theme-primary)" : undefined,
                    color: mode === "light" ? "var(--theme-button-text)" : "var(--theme-text-muted)",
                    borderColor: mode === "light" ? "var(--theme-primary)" : "var(--theme-border)",
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                    mode === "light"
                      ? "ring-2 ring-offset-1 ring-[var(--theme-primary)]"
                      : "bg-[var(--theme-card)] hover:bg-[var(--theme-sidebar-hover)]"
                  }`}
                >
                  <Sun className={`w-4 h-4 ${mode === "light" ? "" : "text-amber-500"}`} />
                  <span>Light Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("dark")}
                  style={{
                    backgroundColor: mode === "dark" ? "var(--theme-primary)" : undefined,
                    color: mode === "dark" ? "var(--theme-button-text)" : "var(--theme-text-muted)",
                    borderColor: mode === "dark" ? "var(--theme-primary)" : "var(--theme-border)",
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                    mode === "dark"
                      ? "ring-2 ring-offset-1 ring-[var(--theme-primary)]"
                      : "bg-[var(--theme-card)] hover:bg-[var(--theme-sidebar-hover)]"
                  }`}
                >
                  <Moon className={`w-4 h-4 ${mode === "dark" ? "" : "text-blue-500"}`} />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Predefined Color Themes Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Color Palette Themes (Applies Globally)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  ✓ Instant Live Switch
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {availableThemes.map((t) => {
                  const isCurrent = theme === t.id;
                  const palette = t[mode];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      style={{
                        borderColor: isCurrent ? palette.primaryColor : "var(--theme-border)",
                        backgroundColor: isCurrent 
                          ? (mode === "dark" ? "rgba(255, 255, 255, 0.06)" : palette.primaryColor + "14") 
                          : "var(--theme-card)"
                      }}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3.5 relative hover:scale-[1.02] ${
                        isCurrent
                          ? "shadow-sm ring-2"
                          : "hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{t.name}</p>
                            {isCurrent && (
                              <span 
                                className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider"
                                style={{
                                  backgroundColor: palette.primaryColor,
                                  color: t.id === "high-contrast" && mode === "dark" ? "#000000" : "#ffffff"
                                }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{t.description}</p>
                        </div>
                        {isCurrent && (
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                            style={{ 
                              backgroundColor: palette.primaryColor,
                              color: t.id === "high-contrast" && mode === "dark" ? "#000000" : "#ffffff"
                            }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Color Swatch Dots */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100/60 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                            style={{ backgroundColor: palette.primaryColor }}
                            title="Primary Accent"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                            style={{ backgroundColor: palette.secondaryColor }}
                            title="Secondary Accent"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                            style={{ backgroundColor: palette.backgroundColor }}
                            title="Background Canvas"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                            style={{ backgroundColor: palette.surfaceColor }}
                            title="Card Surface"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono ml-auto">
                          {mode === "dark" ? "Dark Palette" : "Light Palette"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Edit Password Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Key className="w-4.5 h-4.5 text-amber-500" />
              <span>Change Login Password</span>
            </h3>

            {passwordMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordMessage}</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mt-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mt-1.5"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPassword || !password || !confirmPassword}
                className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSavingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BOOKMARKED BLOGS                                                   */}
      {/* ========================================================================= */}
      {activeTab === "bookmarks" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-150">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <span>Saved Blog Articles</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Quick access to bookmarked technical guides and case studies</p>
            </div>
            <button 
              onClick={fetchBookmarks}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingBookmarks ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((blog) => (
                <div key={blog.id} className="p-4 bg-slate-50/60 dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl transition duration-150 flex flex-col justify-between h-[180px]">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[8px] font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 uppercase shrink-0">
                        {blog.category}
                      </span>
                      <button
                        onClick={() => handleRemoveBookmark(blog.id)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                        title="Remove Bookmark"
                      >
                        <BookmarkMinus className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-snug line-clamp-2 mt-2.5">{blog.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{blog.authorName}</p>
                  </div>

                  <button
                    onClick={() => onReadBlog(blog.id)}
                    className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Read Full Article</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs space-y-3 font-medium">
              <Bookmark className="w-12 h-12 stroke-[1.2] mx-auto text-slate-200 dark:text-slate-700" />
              <div className="space-y-1">
                <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">No bookmarked articles yet</p>
                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                  Save technical blogs and guides from the Blog Community feed to reference them quickly here.
                </p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate("blogs")}
                className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer border border-blue-100 dark:border-blue-800 inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Explore Blog Community</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
