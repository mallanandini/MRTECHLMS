/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, Lock, Sparkles, BookOpen, AlertCircle, 
  CheckCircle, Bookmark, BookmarkMinus, Settings, RefreshCw, Key,
  Palette, Sun, Moon
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
  // Profile update form state
  const [name, setName] = useState(currentUser.name);
  const [profilePhoto, setProfilePhoto] = useState(currentUser.profilePhoto || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  useEffect(() => {
    fetchBookmarks();
  }, [authToken]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage("");
    setProfileError("");
    
    if (!name.trim()) {
      setProfileError("Full Name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, profilePhoto })
      });

      if (res.ok) {
        const updatedUser = await res.json();
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
        // Remove from local list
        setBookmarks(prev => prev.filter(b => b.id !== blogId));
        
        // Update user bookmark array in memory
        setCurrentUser({
          ...currentUser,
          bookmarkedBlogIds: data.bookmarkedBlogIds
        });
      }
    } catch (e) {
      console.error("Failed to unbookmark blog", e);
    }
  };

  const selectAvatarPreset = (url: string) => {
    setProfilePhoto(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white rounded-3xl p-6 md:p-8 shadow-md">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center">
          <Settings className="w-56 h-56 transform translate-x-12 translate-y-12 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-center">
          <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative group">
            {profilePhoto ? (
              <img src={profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold text-blue-300">{currentUser.name.charAt(0)}</span>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <h2 className="text-2xl font-black tracking-tight">{currentUser.name}</h2>
            <p className="text-blue-100/90 text-xs font-mono">{currentUser.email} • {currentUser.role.toUpperCase()}</p>
            <p className="text-[10px] text-blue-200/80 font-mono mt-1">Joined: {new Date(currentUser.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Theme & Visual Display Preferences */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Palette className="w-4.5 h-4.5 text-blue-600" />
                Theme & Display Preferences
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Color Palette Themes (Applies Globally)
                </label>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">
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
                            <p className="font-bold text-xs text-slate-900 truncate">{t.name}</p>
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
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100/60">
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

          {/* Edit Profile Form */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserIcon className="w-4.5 h-4.5 text-blue-600" />
              Update Account Details
            </h3>

            {profileMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Email (Read Only)</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold bg-slate-100 mt-1.5 text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Profile Photo URL</label>
                <input
                  type="text"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 mt-1.5 font-mono"
                />
              </div>

              {/* Avatar Preset Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Select Preset Avatar</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {AVATAR_PRESETS.map((avatar, idx) => {
                    const isSelected = profilePhoto === avatar.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectAvatarPreset(avatar.url)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 relative hover:scale-105 transition duration-150 cursor-pointer ${
                          isSelected ? "border-blue-600 ring-2 ring-blue-500/10" : "border-slate-100 hover:border-slate-300"
                        }`}
                        title={avatar.name}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSavingProfile ? "Saving Changes..." : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Edit Password Form */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Key className="w-4.5 h-4.5 text-amber-500" />
              Change Login Password
            </h3>

            {passwordMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordMessage}</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 mt-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 mt-1.5"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPassword || !password || !confirmPassword}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSavingPassword ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Bookmarks */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Bookmark className="w-4.5 h-4.5 text-blue-600" />
                Bookmarked Blogs
              </h3>
              <button 
                onClick={fetchBookmarks}
                className="p-1 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingBookmarks ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            ) : bookmarks.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {bookmarks.map((blog) => (
                  <div key={blog.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-2xl transition duration-150 flex flex-col justify-between h-[150px]">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[8px] font-bold font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase shrink-0">
                          {blog.category}
                        </span>
                        <button
                          onClick={() => handleRemoveBookmark(blog.id)}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Remove Bookmark"
                        >
                          <BookmarkMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2 mt-2">{blog.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-1 font-mono">{blog.authorName}</p>
                    </div>

                    <button
                      onClick={() => onReadBlog(blog.id)}
                      className="w-full bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold py-1.5 rounded-lg transition border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3" />
                      Read Full Article
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs space-y-3 font-medium">
                <Bookmark className="w-10 h-10 stroke-[1.2] mx-auto text-slate-200" />
                <div className="space-y-0.5">
                  <p className="text-slate-600 font-semibold">No bookmarks yet</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">Save technical blogs from the Blog Community feed to access them quickly here.</p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate("blogs")}
                  className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3.5 py-1.5 rounded-xl hover:bg-blue-100 transition cursor-pointer border border-blue-100"
                >
                  Explore Blogs
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
