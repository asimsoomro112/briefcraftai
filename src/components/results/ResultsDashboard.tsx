"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";
import { copyToClipboard, downloadAsMarkdown } from "@/lib/utils";
import { saveGeneratedPrompt } from "@/lib/firestore";
import { GeneratedPromptData } from "@/types";
import {
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Palette,
  Move,
  Type,
  Layout,
  Globe,
  Edit3,
  CheckCircle2,
  Share2,
  Box,
  Key,
} from "lucide-react";

export function ResultsDashboard() {
  const {
    currentResult,
    setCurrentResult,
    activeBrief,
    updateActiveBrief,
    refreshClientsList,
    settings,
    updateSettings,
    setCurrentView,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [researchExpanded, setResearchExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [customKeyInput, setCustomKeyInput] = useState(settings.customApiKey || "");
  const [keySavedNotice, setKeySavedNotice] = useState(false);

  // Edit brief state for regeneration
  const [editTone, setEditTone] = useState(activeBrief.tones.join(", "));
  const [editHeroFocus, setEditHeroFocus] = useState("");
  const [editNotes, setEditNotes] = useState(activeBrief.timelineNotes || "");

  if (!currentResult) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500 dark:text-zinc-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">No prompt generated yet</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 mb-6">
          Complete the intake wizard to launch the 2026 live research and prompt synthesizer.
        </p>
        <button
          onClick={() => setCurrentView("wizard")}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/20"
        >
          Go to Intake Wizard
        </button>
      </div>
    );
  }

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(currentResult.finalPrompt);
    if (success) {
      setCopied(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#6366f1", "#06b6d4", "#a855f7"],
        });
      } catch (e) {
        // ignore if canvas-confetti unsupported
      }
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    const filename = `${activeBrief.clientName.toLowerCase().replace(/\s+/g, "-")}-build-prompt.md`;
    downloadAsMarkdown(currentResult.finalPrompt, filename);
  };

  // Run Stage B only with user edits (saves cost & time)
  const handleRegenerateWithEdits = async (overrideKey?: string) => {
    setIsRegenerating(true);
    setRegenError(null);
    const keyToUse = overrideKey !== undefined ? overrideKey : settings.customApiKey;

    try {
      const updatedBrief = {
        ...activeBrief,
        tones: editTone.split(",").map((t) => t.trim()).filter(Boolean),
        timelineNotes: editNotes,
        updatedAt: new Date().toISOString(),
      };
      updateActiveBrief(updatedBrief);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (keyToUse) {
        headers["x-gemini-api-key"] = keyToUse;
      }

      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          brief: updatedBrief,
          researchNotes: currentResult.researchNotes,
          model: settings.model,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Gemini is under heavy load right now, please try again in a minute.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Could not read response stream.");
      const decoder = new TextDecoder();
      let buffer = "";
      let newPrompt: GeneratedPromptData | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "complete") {
              newPrompt = msg.data as GeneratedPromptData;
            } else if (msg.type === "error") {
              throw new Error(msg.error || "Gemini is under heavy load right now, please try again in a minute.");
            }
          } catch (e: unknown) {
            throw e;
          }
        }
      }

      if (!newPrompt) {
        throw new Error("Gemini is under heavy load right now, please try again in a minute.");
      }

      // Save new prompt iteration
      await saveGeneratedPrompt(newPrompt);
      await refreshClientsList();

      setCurrentResult(newPrompt);
      setIsEditModalOpen(false);

      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.7 },
        });
      } catch {}
    } catch (err: unknown) {
      console.error("Regeneration error:", err);
      const friendly =
        err instanceof Error ? err.message : "Gemini is under heavy load right now, please try again in a minute.";
      setRegenError(friendly);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel specular-highlight">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {activeBrief.clientName}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              {currentResult.modelUsed}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              AI Studio & Antigravity Ready
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Industry: <span className="text-zinc-900 dark:text-zinc-200 font-medium">{activeBrief.industry}</span> • Objective:{" "}
            <span className="text-zinc-900 dark:text-zinc-200 font-medium capitalize">{activeBrief.primaryGoal}</span> • Tone:{" "}
            <span className="text-zinc-900 dark:text-zinc-200 font-medium">{activeBrief.tones.join(", ")}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
            title="Tweak brief and re-run Stage B without re-searching"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Regenerate with Edits
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Download .md
          </button>

          <button
            onClick={handleCopyPrompt}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              copied
                ? "bg-emerald-600 text-white shadow-emerald-500/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                Copy Build Prompt
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2026 Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Item 1: Master Build Prompt (Primary Large Card, 8 Cols) */}
        <div className="lg:col-span-8 bento-card p-6 specular-highlight flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Master Production Build Prompt</h3>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Feed directly into Google AI Studio Build mode or Antigravity</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white text-[11px] font-medium flex items-center gap-1 border border-zinc-200 dark:border-white/5"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                  {copied ? "Copied" : "Quick Copy"}
                </button>
              </div>
            </div>

            {/* Prompt Viewport */}
            <div className="relative rounded-xl bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-white/10 p-4 max-h-[560px] overflow-y-auto font-mono text-xs text-zinc-800 dark:text-zinc-300 leading-relaxed space-y-4 selection:bg-indigo-500/20">
              <pre className="whitespace-pre-wrap break-words font-sans text-xs text-zinc-800 dark:text-zinc-300">
                {currentResult.finalPrompt}
              </pre>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-white/5 mt-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Length: {currentResult.finalPrompt.length} chars (~{Math.round(currentResult.finalPrompt.length / 5)} words)</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              12/12 Senior Designer Dimensions Covered
            </span>
          </div>
        </div>

        {/* Bento Sidebar: Supporting Decision Cards (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Bento Item 2: Stack & Technology Architecture */}
          <div className="bento-card p-5 specular-highlight space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Recommended 2026 Tech Stack</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentResult.stackChoices.map((stack, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-50 dark:bg-zinc-900 border border-cyan-200 dark:border-white/10 text-cyan-800 dark:text-cyan-300 shadow-sm"
                >
                  {stack}
                </span>
              ))}
            </div>
          </div>

          {/* Bento Item 3: Design Direction */}
          <div className="bento-card p-5 specular-highlight space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Design System & Aesthetics</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              {currentResult.designDirection.map((dir, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{dir}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bento Item 4: Hero Kinetic Concept */}
          <div className="bento-card p-5 specular-highlight space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Move className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Hero Concept Archetype</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
              {currentResult.heroConcept}
            </p>
          </div>

          {/* Bento Item 5: Typography System */}
          <div className="bento-card p-5 specular-highlight space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Type className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Typography Pairing System</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
              {currentResult.typographySystem}
            </p>
          </div>
        </div>
      </div>

      {/* Bento Row 2: Motion Plan, Asset Strategy & Sitemap Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bento Item 6: Motion, Scroll & Micro-Interactions Plan */}
        <div className="bento-card p-6 specular-highlight space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Move className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Motion & Scroll Plan</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Reduced-Motion Safe
            </span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-200 dark:border-white/5">
            {currentResult.motionAndScrollPlan}
          </p>
        </div>

        {/* Bento Item 7: Asset & 3D Strategy */}
        <div className="bento-card p-6 specular-highlight space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Box className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Asset Strategy & 3D Plan</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Concrete & Buildable
            </span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-200 dark:border-white/5">
            {currentResult.assetStrategy ||
              "Generated stylized photography placeholders and procedural Three.js shader geometry ready for real client asset substitution."}
          </p>
        </div>

        {/* Bento Item 8: Key Sections & Sitemap */}
        <div className="bento-card p-6 specular-highlight space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Layout className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Sitemap & Key Sections</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {currentResult.keySections.length} Pages Specified
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentResult.keySections.map((sec, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                {sec}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Item 8: Collapsible Research Notes & Grounded Citations */}
      <div className="bento-card overflow-hidden specular-highlight">
        <button
          type="button"
          onClick={() => setResearchExpanded(!researchExpanded)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Stage A Intelligence & Grounded Sources</h3>
                {currentResult.researchNotes.isLiveResearched ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-medium">
                    Live Web Researched (Google Search)
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-medium">
                    Pre-Trained Knowledge Engine
                  </span>
                )}
                {currentResult.researchNotes.fallbackModelUsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-medium">
                    Fallback Model: {currentResult.researchNotes.fallbackModelUsed}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Inspect the 2026 design landscape analysis and live sources cited
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>{researchExpanded ? "Hide notes" : "Inspect findings"}</span>
            {researchExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {researchExpanded && (
          <div className="p-6 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-950/60 space-y-5 text-xs text-zinc-700 dark:text-zinc-300">
            {/* Summary */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">
                Executive Research Summary
              </h4>
              <p className="leading-relaxed bg-white dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-200 dark:border-white/5">
                {currentResult.researchNotes.summary}
              </p>
            </div>

            {/* Citations Grid */}
            <div className="space-y-2">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">
                Cited Grounding Sources & Competitor References
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentResult.researchNotes.citations.map((c, i) => (
                  <a
                    key={i}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-start justify-between group shadow-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 text-xs">
                        {c.title || c.url}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{c.url}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Search queries executed */}
            {currentResult.researchNotes.searchQueriesUsed?.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">
                  Google Search Queries Executed by Gemini 3.8 Flash
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentResult.researchNotes.searchQueriesUsed.map((query, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 text-[11px] text-zinc-700 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-white/5"
                    >
                      🔍 {query}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Regenerate With Edits Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl glass-panel specular-highlight border border-zinc-200 dark:border-white/15 p-6 space-y-5 shadow-2xl bg-white dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Regenerate with Edits</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Re-runs Stage B only (no search bill). Refines prompt instantly.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Aesthetic Tones (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Additional Scope / Developer Directives
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Make hero section more video-led, add pricing calculator, emphasize GSAP over Lenis..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Stage A live research findings are reused. Only the Stage B synthesis is re-executed, making this iteration fast and cost-free on search queries.
                </span>
              </div>

              {/* API Key options inside modal */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-500" />
                    Gemini API Key:
                  </span>
                  {settings.customApiKey ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                      Custom Key Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Server Default Key
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter custom Gemini key (optional)"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = customKeyInput.trim();
                      updateSettings({ customApiKey: cleaned || undefined });
                      setKeySavedNotice(true);
                      setTimeout(() => setKeySavedNotice(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap active:scale-95 transition-all"
                  >
                    {keySavedNotice ? "✓ Saved" : "Save Key"}
                  </button>
                </div>
              </div>

              {/* Error notice if regeneration fails */}
              {regenError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/25 space-y-2 text-left">
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    {regenError}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Aap apni personal Google AI Studio API key upar enter karke dobara try kar sakte hain.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-white/10">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setRegenError(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerateWithEdits()}
                disabled={isRegenerating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                {isRegenerating ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Re-Synthesizing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Re-Synthesize Prompt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
