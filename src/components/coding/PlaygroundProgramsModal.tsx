/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, FolderCode, Trash2, Edit2, Check, ArrowRight, 
  Search, Clock, Code2, AlertCircle 
} from "lucide-react";
import { StudentPlaygroundProgram } from "../../types.js";

interface PlaygroundProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: StudentPlaygroundProgram[];
  onOpenProgram: (program: StudentPlaygroundProgram) => void;
  onDeleteProgram: (id: string) => Promise<void>;
  onRenameProgram: (id: string, newTitle: string) => Promise<void>;
  isLoading?: boolean;
}

export function PlaygroundProgramsModal({
  isOpen,
  onClose,
  programs,
  onOpenProgram,
  onDeleteProgram,
  onRenameProgram,
  isLoading = false
}: PlaygroundProgramsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredPrograms = programs.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (p: StudentPlaygroundProgram) => {
    setEditingId(p.id);
    setEditTitle(p.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    await onRenameProgram(id, editTitle.trim());
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteProgram(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getLangBadgeColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "python": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "javascript": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "java": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "sql": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "web": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default: return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FolderCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">My Saved Programs</h3>
              <p className="text-xs text-slate-400">Manage and open your personal playground practice scripts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by program title or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Programs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading your saved programs...
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-12">
              <Code2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">
                {searchQuery ? "No programs matching your search" : "No saved programs yet"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Write code in the playground and click "Save" to keep your scripts, templates, and DSA practice code here.
              </p>
            </div>
          ) : (
            filteredPrograms.map((prog) => (
              <div
                key={prog.id}
                className="group p-4 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${getLangBadgeColor(prog.language)}`}>
                      {prog.language}
                    </span>
                    {editingId === prog.id ? (
                      <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(prog.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="px-2 py-0.5 text-xs bg-slate-950 border border-blue-500 rounded text-white focus:outline-none w-full"
                        />
                        <button
                          onClick={() => handleSaveRename(prog.id)}
                          className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
                          title="Save title"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                        {prog.title}
                      </h4>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Updated {new Date(prog.updatedAt).toLocaleDateString()} {new Date(prog.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {prog.code && (
                      <span className="text-slate-500 font-mono text-[10px]">
                        {prog.code.split("\n").length} lines
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {editingId !== prog.id && (
                    <button
                      onClick={() => startEditing(prog)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                      title="Rename program"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(prog.id)}
                    disabled={deletingId === prog.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete program"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onOpenProgram(prog);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors ml-1"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>{programs.length} saved program{programs.length === 1 ? "" : "s"}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
