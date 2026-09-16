/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  PenSquare, Search, ThumbsUp, MessageSquare, ArrowRight, 
  X, Check, AlertCircle, FileText, Send, Calendar, User as UserIcon, Bookmark
} from "lucide-react";
import { Blog, Comment, UserRole, User } from "../types.js";

interface BlogPortalProps {
  authToken: string;
  userRole: UserRole;
  userId: string;
  currentUser?: User;
  setCurrentUser?: (user: User) => void;
}

export function BlogPortal({ 
  authToken, userRole, userId, currentUser, setCurrentUser 
}: BlogPortalProps) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Blog creation composer modal state
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [tags, setTags] = useState("");

  const fetchBlogs = async () => {
    try {
      const endpoint = (userRole === UserRole.TRAINER || userRole === UserRole.ADMIN) 
        ? "/api/blogs/all" 
        : "/api/blogs";
      const response = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBlogs(data);
      }
    } catch (err) {
      console.error("Error loading blogs", err);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [authToken, userRole]);

  const handleSelectBlog = async (blog: Blog) => {
    setSelectedBlog(blog);
    try {
      const res = await fetch(`/api/blogs/${blog.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Error loading blog comments", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !selectedBlog) return;

    try {
      const res = await fetch(`/api/blogs/${selectedBlog.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: commentContent })
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setCommentContent("");
      }
    } catch (err) {
      console.error("Error posting comment", err);
    }
  };

  const handleLikeBlog = async (blogId: string) => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/like`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setBlogs(prev => prev.map(b => b.id === blogId ? updated : b));
        if (selectedBlog && selectedBlog.id === blogId) {
          setSelectedBlog(updated);
        }
      }
    } catch (err) {
      console.error("Error liking blog", err);
    }
  };

  const handleBookmarkBlog = async (blogId: string) => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/bookmark`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Update blogs array
        setBlogs(prev => prev.map(b => b.id === blogId ? { ...b, bookmarksCount: data.bookmarksCount } : b));
        
        if (selectedBlog && selectedBlog.id === blogId) {
          setSelectedBlog(prev => prev ? { ...prev, bookmarksCount: data.bookmarksCount } : null);
        }
        
        if (currentUser && setCurrentUser) {
          setCurrentUser({
            ...currentUser,
            bookmarkedBlogIds: data.bookmarkedBlogIds
          });
        }
      }
    } catch (err) {
      console.error("Error bookmarking blog", err);
    }
  };

  const isBookmarked = (blogId: string) => {
    return currentUser?.bookmarkedBlogIds?.includes(blogId) || false;
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title,
          summary,
          content,
          category,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean)
        })
      });

      if (res.ok) {
        setTitle("");
        setSummary("");
        setContent("");
        setTags("");
        setIsComposing(false);
        fetchBlogs();
      }
    } catch (err) {
      console.error("Error publishing blog", err);
    }
  };

  const handleModerateBlog = async (blogId: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchBlogs();
        if (selectedBlog && selectedBlog.id === blogId) {
          setSelectedBlog(null);
        }
      }
    } catch (err) {
      console.error("Error moderating blog", err);
    }
  };

  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || b.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["All", "Web Development", "Artificial Intelligence", "Career Advice", "General Engineering"];

  return (
    <div className="space-y-6">
      {/* Search and Category filters banner */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blogs, markdown topics..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === cat 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Create blog options for trainers/admins */}
        {(userRole === UserRole.TRAINER || userRole === UserRole.ADMIN) && (
          <button
            onClick={() => setIsComposing(true)}
            className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <PenSquare className="w-4 h-4" />
            Write Blog Post
          </button>
        )}
      </div>

      {/* Grid of articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBlogs.length > 0 ? (
          filteredBlogs.map((blog) => (
            <div 
              key={blog.id} 
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col h-[400px]"
            >
              <div className="h-44 bg-slate-100 relative">
                <img 
                  src={blog.coverImage || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80"} 
                  alt={blog.title} 
                  className="w-full h-full object-cover"
                />
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md absolute left-4 top-4 uppercase tracking-wider shadow-sm font-mono border border-blue-100">
                  {blog.category}
                </span>
                
                {/* Moderation Badges */}
                {blog.status === "pending" && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md absolute right-4 top-4 uppercase tracking-wider font-mono border border-amber-100 shadow-sm">
                    Pending Review
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold font-mono">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{blog.authorName}</span>
                    <span>•</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 line-clamp-2 text-md tracking-tight leading-snug">{blog.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{blog.summary}</p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleLikeBlog(blog.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600 transition cursor-pointer"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{blog.likesCount}</span>
                    </button>

                    {currentUser?.role === UserRole.STUDENT && (
                      <button 
                        onClick={() => handleBookmarkBlog(blog.id)}
                        className={`flex items-center gap-1 text-xs font-semibold transition cursor-pointer ${
                          isBookmarked(blog.id) ? "text-amber-500 hover:text-amber-600" : "text-gray-500 hover:text-amber-500"
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked(blog.id) ? "fill-amber-500 text-amber-500" : ""}`} />
                        <span>{blog.bookmarksCount || 0}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      <span>Comments</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectBlog(blog)}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 transition"
                  >
                    <span>Read More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-2xl text-gray-400 font-medium">
            No published blog posts found.
          </div>
        )}
      </div>

      {/* Reading Article Modal */}
      {selectedBlog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 overflow-hidden">
          <div className="w-full max-w-3xl bg-white h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-200">
            {/* Header toolbar */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <button 
                onClick={() => setSelectedBlog(null)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Moderate Buttons for Admins */}
              {userRole === UserRole.ADMIN && selectedBlog.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModerateBlog(selectedBlog.id, "rejected")}
                    className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleModerateBlog(selectedBlog.id, "approved")}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable contents */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
                  {selectedBlog.category}
                </span>
                <h1 className="font-bold text-3xl text-gray-900 leading-tight tracking-tight">{selectedBlog.title}</h1>
                
                <div className="flex items-center gap-3 text-xs text-gray-400 font-mono font-semibold pt-1 border-b border-gray-100 pb-4">
                  <span className="text-gray-600 font-semibold">{selectedBlog.authorName}</span>
                  <span>•</span>
                  <span>{new Date(selectedBlog.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Cover Image */}
              <div className="rounded-2xl overflow-hidden aspect-video border border-gray-100 shadow-sm">
                <img 
                  src={selectedBlog.coverImage || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80"} 
                  alt={selectedBlog.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Render content split with simple Markdown parsers */}
              <div className="prose max-w-none text-gray-700 leading-relaxed space-y-4 pt-2">
                {selectedBlog.content.split("\n").map((line, idx) => {
                  if (line.startsWith("## ")) {
                    return <h2 key={idx} className="text-xl font-bold text-gray-950 pt-4 leading-tight">{line.replace("## ", "")}</h2>;
                  }
                  if (line.startsWith("### ")) {
                    return <h3 key={idx} className="text-lg font-bold text-gray-900 pt-2">{line.replace("### ", "")}</h3>;
                  }
                  if (line.startsWith("`")) {
                    return (
                      <pre key={idx} className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto my-3 border border-slate-800">
                        <code>{line.replace(/`/g, "")}</code>
                      </pre>
                    );
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>

              {/* Comments Section */}
              <div className="border-t border-gray-100 pt-8 mt-8 space-y-6">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  Community Comments ({comments.length})
                </h3>

                {/* List Comments */}
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span className="text-gray-900">{comment.authorName}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono bg-slate-200/50 px-1.5 py-0.5 rounded-sm">
                              {comment.authorRole}
                            </span>
                          </div>
                          <span className="text-gray-400 font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">No comments posted yet. Start the conversation!</p>
                  )}
                </div>

                {/* Write comment */}
                <form onSubmit={handlePostComment} className="flex gap-3">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Write a supportive, polite comment..."
                    className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 rounded-xl flex items-center justify-center gap-1 shadow-sm transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blog Composer Modal for trainers */}
      {isComposing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4">
          <form 
            onSubmit={handleCreateBlog}
            className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-gray-900 text-md">Write & Publish Blog Article</h3>
              <button 
                type="button"
                onClick={() => setIsComposing(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Article Title:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive, engaging title..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 bg-slate-50"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Career Advice">Career Advice</option>
                    <option value="General Engineering">General Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Tags (comma-separated):</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="react, typescript, css..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Brief Summary:</label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summarize the core takeaways in 1-2 sentences..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Full Content (supports markdown headers):</label>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your main article text here. Use ## for major headings, ### for sub-headings, and code-blocks for code examples."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 font-mono"
                  required
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-600 transition"
              >
                Cancel Draft
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                Publish for Admin Approval
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
