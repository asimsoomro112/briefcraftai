"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatDate } from "@/lib/utils";
import { X, Search, History, ArrowRight, Sparkles, Building2, Calendar } from "lucide-react";

export function HistoryDrawer() {
  const {
    isHistoryOpen,
    setIsHistoryOpen,
    clientsList,
    loadBriefAndPrompt,
    activeBrief,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");

  if (!isHistoryOpen) return null;

  const filteredClients = clientsList.filter((client) => {
    const q = searchQuery.toLowerCase();
    return (
      client.clientName.toLowerCase().includes(q) ||
      client.industry.toLowerCase().includes(q) ||
      client.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white dark:bg-zinc-950/95 border-l border-zinc-200 dark:border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Client Portfolio</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Past client briefs & generated build prompts</p>
            </div>
          </div>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors active:scale-95 touch-manipulation"
            aria-label="Close client portfolio drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="py-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredClients.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Building2 className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No client briefs found</p>
              <p className="text-xs text-zinc-500 mt-1">
                Completed briefs and generated prompts will automatically appear here.
              </p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isActive = activeBrief?.id === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => loadBriefAndPrompt(client.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm shadow-indigo-500/20"
                      : "border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/60 dark:hover:border-white/15 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {client.clientName}
                        </h4>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                        {client.industry}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                    {client.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-200 dark:border-white/5 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {formatDate(client.updatedAt || client.createdAt)}
                    </span>
                    <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-[10px]">
                      {client.primaryGoal}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex justify-between items-center text-xs text-zinc-500">
          <span>{clientsList.length} total saved clients</span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
            <Sparkles className="w-3 h-3" />
            Instant reload (0 fetch cost)
          </span>
        </div>
      </div>
    </div>
  );
}
